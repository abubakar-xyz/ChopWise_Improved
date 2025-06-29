from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import datetime
import regex as re
import os
import random
from difflib import get_close_matches
from starlette.concurrency import run_in_threadpool
from functools import lru_cache

# ─── App & CORS Setup ──────────────────────────────────────────────────────────
app = FastAPI()
# Allow your Netlify site (or “*” during dev) to call these endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # in prod, replace "*" with your Netlify URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Make sure relative paths resolve
os.chdir(os.path.dirname(__file__))

# ─── Load Model & Data ─────────────────────────────────────────────────────────
model       = joblib.load("model.pkl")
feature_cols = joblib.load("features.pkl")
df_raw      = pd.read_csv(
    "FoodPrices_Dataset.csv",
    parse_dates=["Date"],
    dayfirst=True
)

# Precompute lookups for fast access
foods  = df_raw["Food Item"].unique()
states = df_raw["State"].unique()
lgas   = df_raw["LGA"].unique()
outlets= df_raw["Outlet Type"].unique()
by_food = {f: df_raw[df_raw["Food Item"]==f] for f in foods}
by_state = {s: df_raw[df_raw["State"]==s] for s in states}

# In-memory cache for forecasts
forecast_cache = {}

# ─── Request Schema ────────────────────────────────────────────────────────────
class Request(BaseModel):
    message: str

# ─── Helpers ──────────────────────────────────────────────────────────────────
def format_reply(templates, **kwargs):
    """Pick one of the templates at random and format it."""
    return random.choice(templates).format(**kwargs)

# --- Entity Extraction Helper ---
def extract_entities(text):
    import re as _re
    clean = _re.sub(r'[\W_]+', ' ', text.lower())
    words = set(clean.split())
    # Foods: match all variants if a generic name is present
    matching_foods = []
    for f in foods:
        f_words = set(f.lower().split())
        # If any word in the query matches any word in the food name, or vice versa
        if any(w in f_words or any(fw in w for fw in f_words) for w in words):
            matching_foods.append(f)
    # If no direct match, try substring match
    if not matching_foods:
        for f in foods:
            if any(w in f.lower() or f.lower() in w for w in words):
                matching_foods.append(f)
    # If still no match, try fuzzy
    if not matching_foods:
        from difflib import get_close_matches
        matches = get_close_matches(' '.join(words), [f.lower() for f in foods], n=3, cutoff=0.4)
        matching_foods = [f for f in foods if f.lower() in matches]
    # States
    found_state = next((s for s in states if s.lower() in text), None)
    # LGAs
    found_lga = next((l for l in lgas if isinstance(l, str) and l.lower() in text), None)
    # Outlets
    found_outlet = next((o for o in outlets if isinstance(o, str) and o.lower() in text), None)
    return {
        'foods': matching_foods,
        'state': found_state,
        'lga': found_lga,
        'outlet': found_outlet
    }

# --- Intent Scoring Helper ---
def score_intents(text):
    text = text.lower()
    words = text.split()
    def score(keywords):
        return sum(1 for w in words for k in keywords if k in w) / max(1, len(words))
    intents = {
        'cheapest': score(["cheapest", "best", "lowest", "where", "find"]),
        'trend': score(["trend", "change", "history", "past", "recent"]),
        'forecast': score(["predict", "forecast", "future", "next", "after"]),
        'price': score(["price", "cost", "how much", "current"])
    }
    return intents

# ─── Health Check Endpoint ─────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

# --- Async Chat Endpoint ---
from fastapi import Request as FastAPIRequest
@app.post("/chat")
async def chat(req: Request):
    text = req.message
    entities = extract_entities(text)
    matching_foods = entities['foods']
    found_state = entities['state']
    found_lga = entities['lga']
    found_outlet = entities['outlet']
    # Early validation
    if not matching_foods:
        from difflib import get_close_matches
        suggestions = get_close_matches(text, [f.lower() for f in foods], n=3, cutoff=0.4)
        if suggestions:
            sug_names = ', '.join([f.title() for f in suggestions])
            return {"reply": f"I couldn't find that food item. Did you mean: {sug_names}?"}
        return {"reply": "Sorry, I couldn't recognize the food item. Please try again with a different name."}
    # Intent scoring
    intents = score_intents(text)
    intent, score = max(intents.items(), key=lambda x: x[1])
    if score < 0.3:
        intent = 'price'  # Default to price if not confident
    # Run heavy logic in threadpool
    return await run_in_threadpool(process_intent, intent, matching_foods, found_state, found_lga, found_outlet, text)

def process_intent(intent, matching_foods, found_state, found_lga, found_outlet, text):
    try:
        # Multi-food always returns all variants
        if len(matching_foods) > 1:
            reply = "Here are the results for all matching food items:\n"
            for food in matching_foods:
                df_item = by_food[food]
                if found_state:
                    df_item = df_item[df_item["State"] == found_state]
                if found_lga:
                    df_item = df_item[df_item["LGA"] == found_lga]
                if found_outlet:
                    df_item = df_item[df_item["Outlet Type"] == found_outlet]
                if df_item.empty:
                    reply += f"- {food}: No data available.\n"
                    continue
                latest_date = df_item["Date"].max()
                latest_price = df_item[df_item["Date"] == latest_date]["UPRICE"].mean()
                reply += f"- {food}: ₦{latest_price:,.0f} (latest: {latest_date.date()})\n"
            reply += "\nTip: You can specify a state, LGA, or outlet for more precise info!"
            return {"reply": reply}
        # Cheapest intent
        if intent == 'cheapest':
            food = matching_foods[0]
            df_item = by_food[food]
            if found_state:
                df_item = df_item[df_item["State"] == found_state]
            lga_prices = df_item.groupby("LGA")["UPRICE"].mean().sort_values().head(3)
            outlet_prices = df_item.groupby("Outlet Type")["UPRICE"].mean().sort_values().head(3)
            reply = f"Top 3 cheapest LGAs for {food}"
            if found_state:
                reply += f" in {found_state}"
            reply += ":\n"
            for i, (lga, price) in enumerate(lga_prices.items(), 1):
                reply += f"{i}. {lga}: ₦{price:,.0f}\n"
            reply += f"\nTop 3 cheapest outlet types for {food}"
            if found_state:
                reply += f" in {found_state}"
            reply += ":\n"
            for i, (outlet, price) in enumerate(outlet_prices.items(), 1):
                reply += f"{i}. {outlet}: ₦{price:,.0f}\n"
            reply += "\nWant more details? Ask about a specific LGA or outlet!"
            return {"reply": reply}
        # Forecast intent (with cache)
        if intent == 'forecast':
            import regex as re
            forecast_match = re.search(r'(predict|forecast|future price|price in) (.+?) (in|after) (\d+) (month|months|weeks|days)', text)
            if forecast_match:
                num = int(forecast_match.group(4))
                unit = forecast_match.group(5)
                cache_key = (tuple(matching_foods), found_state, num, unit)
                if cache_key in forecast_cache:
                    return {"reply": forecast_cache[cache_key]}
                if unit.startswith('month'):
                    delta = pd.Timedelta(days=30*num)
                elif unit.startswith('week'):
                    delta = pd.Timedelta(days=7*num)
                else:
                    delta = pd.Timedelta(days=num)
                future_date = df_raw["Date"].max() + delta
                reply = ""
                for food in matching_foods:
                    row = {col: 0 for col in feature_cols}
                    row['day'] = future_date.day
                    row['month'] = future_date.month
                    row['year'] = future_date.year
                    food_col = [c for c in feature_cols if food in c]
                    state_col = [c for c in feature_cols if found_state and found_state in c]
                    for c in food_col: row[c] = 1
                    for c in state_col: row[c] = 1
                    X_pred = pd.DataFrame([row])[feature_cols]
                    pred = model.predict(X_pred)[0]
                    reply += f"Forecasted price of {food}{' in ' + found_state if found_state else ''} in {num} {unit}: ₦{pred:,.0f}\n"
                reply += "\nCurious about trends? Ask for a trend summary!"
                forecast_cache[cache_key] = reply
                return {"reply": reply}
        # Trend intent
        if intent == 'trend':
            food = matching_foods[0]
            df_item = by_food[food]
            if found_state:
                df_item = df_item[df_item["State"] == found_state]
            if found_lga:
                df_item = df_item[df_item["LGA"] == found_lga]
            if found_outlet:
                df_item = df_item[df_item["Outlet Type"] == found_outlet]
            if df_item.empty:
                return {"reply": "Sorry, I couldn't find enough data for that query."}
            latest_date  = df_item["Date"].max()
            latest_price = df_item[df_item["Date"] == latest_date]["UPRICE"].mean()
            one_month_ago   = latest_date - pd.Timedelta(days=30)
            three_months_ago= latest_date - pd.Timedelta(days=90)
            recent_1m       = df_item[df_item["Date"] >= one_month_ago]["UPRICE"]
            recent_3m       = df_item[df_item["Date"] >= three_months_ago]["UPRICE"]
            avg_1m = recent_1m.mean() if not recent_1m.empty else latest_price
            avg_3m = recent_3m.mean() if not recent_3m.empty else latest_price
            pct_1m = (latest_price - avg_1m) / avg_1m * 100 if avg_1m else 0
            pct_3m = (latest_price - avg_3m) / avg_3m * 100 if avg_3m else 0
            if pct_1m > 5:
                trend = f"Prices are rising (up {pct_1m:.1f}% in the last month)."
            elif pct_1m < -5:
                trend = f"Prices are falling (down {abs(pct_1m):.1f}% in the last month)."
            else:
                trend = "Prices are stable over the last month."
            loc = f" in {found_state}" if found_state else ""
            lga = f", {found_lga}" if found_lga else ""
            outlet = f" at {found_outlet}" if found_outlet else ""
            reply = f"Trend for {food}{loc}{lga}{outlet}: {trend}\n"
            reply += "\nTip: You can ask for the cheapest LGA or outlet, or request a forecast!"
            return {"reply": reply}
        # Price intent (default)
        food = matching_foods[0]
        df_item = by_food[food]
        if found_state:
            df_item = df_item[df_item["State"] == found_state]
        if found_lga:
            df_item = df_item[df_item["LGA"] == found_lga]
        if found_outlet:
            df_item = df_item[df_item["Outlet Type"] == found_outlet]
        if df_item.empty:
            return {"reply": "Sorry, I couldn't find enough data for that query."}
        latest_date  = df_item["Date"].max()
        latest_price = df_item[df_item["Date"] == latest_date]["UPRICE"].mean()
        reply = f"Latest price of {food}{' in ' + found_state if found_state else ''}: ₦{latest_price:,.0f}\n"
        reply += "\nTip: You can ask for the cheapest LGA or outlet, or request a forecast!"
        return {"reply": reply}
    except Exception as e:
        return {"reply": "Sorry, something went wrong. Please try again later or contact support if the issue persists."}