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

# ─── Request Schema ────────────────────────────────────────────────────────────
class Request(BaseModel):
    message: str

# ─── Helpers ──────────────────────────────────────────────────────────────────
def format_reply(templates, **kwargs):
    """Pick one of the templates at random and format it."""
    return random.choice(templates).format(**kwargs)

# ─── Health Check Endpoint ─────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

# ─── /chat Endpoint ────────────────────────────────────────────────────────────
@app.post("/chat")
def chat(req: Request):
    try:
        text   = req.message.lower()
        foods  = df_raw["Food Item"].unique()
        states = df_raw["State"].unique()
        lgas    = df_raw["LGA"].unique()
        outlets = df_raw["Outlet Type"].unique()

        # Fuzzy match food
        found_food = next((f for f in foods if f.lower() in text), None)
        if not found_food:
            matches = get_close_matches(text, [f.lower() for f in foods], n=1, cutoff=0.6)
            if matches:
                found_food = next((f for f in foods if f.lower() == matches[0]), None)

        # Fuzzy match state
        found_state = next((s for s in states if s.lower() in text), None)
        if not found_state:
            matches = get_close_matches(text, [s.lower() for s in states], n=1, cutoff=0.6)
            if matches:
                found_state = next((s for s in states if s.lower() == matches[0]), None)

        # Fuzzy match LGA
        found_lga = next((l for l in lgas if l and l.lower() in text), None)
        if not found_lga:
            matches = get_close_matches(text, [l.lower() for l in lgas if isinstance(l, str)], n=1, cutoff=0.6)
            if matches:
                found_lga = next((l for l in lgas if isinstance(l, str) and l.lower() == matches[0]), None)

        # Fuzzy match Outlet
        found_outlet = next((o for o in outlets if o and o.lower() in text), None)
        if not found_outlet:
            matches = get_close_matches(text, [o.lower() for o in outlets if isinstance(o, str)], n=1, cutoff=0.6)
            if matches:
                found_outlet = next((o for o in outlets if isinstance(o, str) and o.lower() == matches[0]), None)

        # Help fallback
        if "help" in text or "usage" in text:
            return {"reply": format_reply([
                "No worries—I can help! Try: 'price of maize white in Lagos', 'cheapest LGA for beans', or 'best outlet for rice in Abuja'.",
                "You can ask: 'price of yam in Kano', 'cheapest place for garri in Ibadan', or 'help' for more tips.",
                "Ask about food prices by state, LGA, or outlet. E.g. 'cheapest outlet for rice in Lagos' or 'trend for beans in Potiskum'."
            ]) + "\n\n(Data source: Nigerian Food Price Tracking Dataset, NBS)"}

        # If no food found, suggest closest matches
        if not found_food:
            suggestions = get_close_matches(text, [f.lower() for f in foods], n=3, cutoff=0.4)
            if suggestions:
                sug_names = ', '.join([f.title() for f in suggestions])
                return {"reply": f"I couldn't find that food item. Did you mean: {sug_names}?"}
            return {"reply": "Sorry, I couldn't recognize the food item. Please try again with a different name."}

        # If no state/LGA/outlet found, suggest closest matches
        if found_lga is None and any(s in text for s in ["lga", "local government", "area"]):
            suggestions = get_close_matches(text, [l.lower() for l in lgas if isinstance(l, str)], n=3, cutoff=0.4)
            if suggestions:
                sug_names = ', '.join([l.title() for l in suggestions])
                return {"reply": f"I couldn't find that LGA. Did you mean: {sug_names}?"}
        if found_outlet is None and any(s in text for s in ["outlet", "shop", "market", "store"]):
            suggestions = get_close_matches(text, [o.lower() for o in outlets if isinstance(o, str)], n=3, cutoff=0.4)
            if suggestions:
                sug_names = ', '.join([o.title() for o in suggestions])
                return {"reply": f"I couldn't find that outlet type. Did you mean: {sug_names}?"}
        if found_state is None and any(s in text for s in ["state", "where", "location"]):
            suggestions = get_close_matches(text, [s.lower() for s in states], n=3, cutoff=0.4)
            if suggestions:
                sug_names = ', '.join([s.title() for s in suggestions])
                return {"reply": f"I couldn't find that state. Did you mean: {sug_names}?"}

        # --- Advanced intent detection and robust food matching ---
        # Lowercase and remove punctuation for better matching
        import re as _re
        clean_text = _re.sub(r'[^\w\s]', '', text)
        words = set(clean_text.split())

        # Find all foods that are a substring or token match
        matching_foods = [f for f in foods if any(w in f.lower() or f.lower() in w for w in words)]
        # If still nothing, try partial match
        if not matching_foods:
            matching_foods = [f for f in foods if any(w in f.lower() or f.lower() in w for w in text.split())]
        # If still nothing, try fuzzy match
        if not matching_foods:
            matches = get_close_matches(text, [f.lower() for f in foods], n=3, cutoff=0.4)
            matching_foods = [f for f in foods if f.lower() in matches]
        # If still nothing, fallback to found_food
        if not matching_foods and found_food:
            matching_foods = [found_food]
        if not matching_foods:
            suggestions = get_close_matches(text, [f.lower() for f in foods], n=3, cutoff=0.4)
            if suggestions:
                sug_names = ', '.join([f.title() for f in suggestions])
                return {"reply": f"I couldn't find that food item. Did you mean: {sug_names}?"}
            return {"reply": "Sorry, I couldn't recognize the food item. Please try again with a different name."}

        # --- Intent detection ---
        is_cheapest = any(word in text for word in ["cheapest", "best place", "best lga", "best outlet", "lowest price", "where is", "where can"])
        is_trend = any(word in text for word in ["trend", "change", "history", "past", "recent"])
        is_forecast = any(word in text for word in ["predict", "forecast", "future price", "price in", "next week", "next month", "after"])
        is_price = any(word in text for word in ["price", "cost", "how much", "current"])

        # --- Handle multi-food queries ---
        if len(matching_foods) > 1 and (is_price or is_cheapest or is_trend or is_forecast):
            reply = "Here are the results for all matching food items:\n"
            for food in matching_foods:
                df_item = df_raw[df_raw["Food Item"] == food]
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

        # --- Cheapest LGA/Outlet intent ---
        if is_cheapest:
            food = matching_foods[0]
            df_item = df_raw[df_raw["Food Item"] == food]
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

        # --- Forecast intent ---
        forecast_match = re.search(r'(predict|forecast|future price|price in) (.+?) (in|after) (\d+) (month|months|weeks|days)', text)
        if is_forecast and forecast_match and matching_foods:
            num = int(forecast_match.group(4))
            unit = forecast_match.group(5)
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
            return {"reply": reply}

        # --- Trend intent ---
        if is_trend:
            food = matching_foods[0]
            df_item = df_raw[df_raw["Food Item"] == food]
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

        # --- Price intent (default) ---
        food = matching_foods[0]
        df_item = df_raw[df_raw["Food Item"] == food]
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