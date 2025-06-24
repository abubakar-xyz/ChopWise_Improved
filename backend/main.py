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

        # Help fallback
        if "help" in text or "usage" in text:
            return {"reply": format_reply([
                "No worries—I can help! Try: 'price of maize white in Lagos' or 'predict price of beans in Abuja 3 months.'",
                "I'm here for you! You could ask: 'price of yam in Kano' or just type 'help' for more tips.",
                "Feel free to say something like 'price of garri in Lokoja' or type 'help' if you're stuck."
            ]) + "\n\n(Data source: Nigerian Food Price Tracking Dataset, NBS)"}

        # If no food found, suggest closest matches
        if not found_food:
            suggestions = get_close_matches(text, [f.lower() for f in foods], n=3, cutoff=0.4)
            if suggestions:
                sug_names = ', '.join([f.title() for f in suggestions])
                return {"reply": f"I couldn't find that food item. Did you mean: {sug_names}?"}
            return {"reply": "Sorry, I couldn't recognize the food item. Please try again with a different name."}

        # If no state found, suggest closest matches
        if found_state is None and any(s in text for s in ["state", "where", "location"]):
            suggestions = get_close_matches(text, [s.lower() for s in states], n=3, cutoff=0.4)
            if suggestions:
                sug_names = ', '.join([s.title() for s in suggestions])
                return {"reply": f"I couldn't find that state. Did you mean: {sug_names}?"}

        # Top-3 cheapest states for a food item
        if any(word in text for word in ["cheapest", "best place", "best state", "where is", "lowest price"]):
            df_item = df_raw[df_raw["Food Item"] == found_food]
            state_prices = df_item.groupby("State")["UPRICE"].mean().sort_values().head(3)
            reply = f"Top 3 cheapest states for {found_food}:\n"
            for i, (state, price) in enumerate(state_prices.items(), 1):
                reply += f"{i}. {state}: ₦{price:,.0f}\n"
            reply += "\n(Data source: Nigerian Food Price Tracking Dataset, NBS)"
            return {"reply": reply}

        # Model-based price forecasting
        forecast_match = re.search(r'(predict|forecast|future price|price in) (.+?) (in|after) (\d+) (month|months|weeks|days)', text)
        if forecast_match and found_food:
            num = int(forecast_match.group(4))
            unit = forecast_match.group(5)
            if unit.startswith('month'):
                delta = pd.Timedelta(days=30*num)
            elif unit.startswith('week'):
                delta = pd.Timedelta(days=7*num)
            else:
                delta = pd.Timedelta(days=num)
            future_date = df_raw["Date"].max() + delta
            # Prepare features for prediction
            row = {col: 0 for col in feature_cols}
            row['day'] = future_date.day
            row['month'] = future_date.month
            row['year'] = future_date.year
            food_col = [c for c in feature_cols if found_food in c]
            state_col = [c for c in feature_cols if found_state and found_state in c]
            for c in food_col: row[c] = 1
            for c in state_col: row[c] = 1
            X_pred = pd.DataFrame([row])[feature_cols]
            pred = model.predict(X_pred)[0]
            reply = f"Forecasted price of {found_food}{' in ' + found_state if found_state else ''} in {num} {unit}: ₦{pred:,.0f}\n\n(Data source: Nigerian Food Price Tracking Dataset, NBS)"
            return {"reply": reply}

        # Filter dataset
        df_item = df_raw[df_raw["Food Item"] == found_food]
        if found_state:
            df_item = df_item[df_item["State"] == found_state]

        if df_item.empty:
            return {"reply": "Sorry, I couldn't find enough data for that query."}

        # Latest price
        latest_date  = df_item["Date"].max()
        latest_price = df_item[df_item["Date"] == latest_date]["UPRICE"].mean()

        # Trend windows
        one_month_ago   = latest_date - pd.Timedelta(days=30)
        three_months_ago= latest_date - pd.Timedelta(days=90)
        recent_1m       = df_item[df_item["Date"] >= one_month_ago]["UPRICE"]
        recent_3m       = df_item[df_item["Date"] >= three_months_ago]["UPRICE"]

        avg_1m = recent_1m.mean() if not recent_1m.empty else latest_price
        avg_3m = recent_3m.mean() if not recent_3m.empty else latest_price
        pct_1m = (latest_price - avg_1m) / avg_1m * 100 if avg_1m else 0
        pct_3m = (latest_price - avg_3m) / avg_3m * 100 if avg_3m else 0

        # Trend summary
        if pct_1m > 5:
            trend = f"Prices are rising (up {pct_1m:.1f}% in the last month)."
        elif pct_1m < -5:
            trend = f"Prices are falling (down {abs(pct_1m):.1f}% in the last month)."
        else:
            trend = "Prices are stable over the last month."

        loc = f" in {found_state}" if found_state else ""
        reply = f"Latest price of {found_food}{loc}: ₦{latest_price:,.0f}\n{trend}\n\n(Data source: Nigerian Food Price Tracking Dataset, NBS)"
        return {"reply": reply}

    except Exception as e:
        return {"reply": "Sorry, something went wrong. Please try again later. (If this persists, contact support.)"}