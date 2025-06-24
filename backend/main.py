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

# ─── /chat Endpoint ────────────────────────────────────────────────────────────
@app.post("/chat")
def chat(req: Request):
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
        ]) + "\n\nData source: Nigeria Food Price Tracking Dataset from the National Bureau of Statistics."}

    # If no food found, suggest closest matches
    if not found_food:
        suggestions = get_close_matches(text, [f.lower() for f in foods], n=3, cutoff=0.4)
        if suggestions:
            sug_names = ', '.join([f.title() for f in suggestions])
            return {"reply": f"I couldn't find that food item. Did you mean: {sug_names}?\n\nData source: Nigeria Food Price Tracking Dataset from the National Bureau of Statistics."}
        return {"reply": "Sorry, I couldn't recognize the food item. Please try again with a different name.\n\nData source: Nigeria Food Price Tracking Dataset from the National Bureau of Statistics."}

    # If no state found, suggest closest matches
    if found_state is None and any(s in text for s in ["state", "where", "location"]):
        suggestions = get_close_matches(text, [s.lower() for s in states], n=3, cutoff=0.4)
        if suggestions:
            sug_names = ', '.join([s.title() for s in suggestions])
            return {"reply": f"I couldn't find that state. Did you mean: {sug_names}?\n\nData source: Nigeria Food Price Tracking Dataset from the National Bureau of Statistics."}

    # Top-3 cheapest states for a food item
    if any(word in text for word in ["cheapest", "best place", "best state", "where is", "lowest price"]):
        df_item = df_raw[df_raw["Food Item"] == found_food]
        state_prices = df_item.groupby("State")["UPRICE"].mean().sort_values().head(3)
        reply = f"The top-3 cheapest states for {found_food} are: " + ", ".join([f"{state} (₦{price:.2f})" for state, price in state_prices.items()])
        reply += "\n\nData source: Nigeria Food Price Tracking Dataset from the National Bureau of Statistics."
        return {"reply": reply}

    # Model-based price forecasting
    forecast_match = re.search(r'(predict|forecast|future price|price in) (.+?) (in|after) (\d+) (month|months|weeks|days)', text)
    if forecast_match and found_food:
        # Extract state if present
        state_match = next((s for s in states if s.lower() in text), None)
        found_state = state_match if state_match else found_state
        num = int(forecast_match.group(4))
        unit = forecast_match.group(5)
        if unit.startswith('month'):
            delta = pd.DateOffset(months=num)
        elif unit.startswith('week'):
            delta = pd.DateOffset(weeks=num)
        else:
            delta = pd.DateOffset(days=num)
        future_date = df_raw["Date"].max() + delta
        # Prepare features for prediction
        features = {}
        features['Food Item'] = found_food
        features['State'] = found_state if found_state else states[0]
        features['Date'] = future_date
        # One-hot encoding and feature alignment
        X_pred = pd.DataFrame([features])
        for col in feature_cols:
            if col not in X_pred.columns:
                X_pred[col] = 0
        X_pred = X_pred[feature_cols]
        pred_price = model.predict(X_pred)[0]
        reply = f"The predicted price for {found_food} in {features['State']} in {num} {unit} is ₦{pred_price:.2f}.\n\nData source: Nigeria Food Price Tracking Dataset from the National Bureau of Statistics."
        return {"reply": reply}

    # Filter dataset
    df_item = df_raw[df_raw["Food Item"] == found_food]
    if found_state:
        df_item = df_item[df_item["State"] == found_state]

    if df_item.empty:
        return {"reply": "Sorry, I couldn't find price data for that combination. Try another food or state.\n\nData source: Nigeria Food Price Tracking Dataset from the National Bureau of Statistics."}

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
        trend = f"Up {pct_1m:.1f}% in the last month."
        sugg = "Prices are climbing 📈—it might be smart to buy soon."
    elif pct_1m < -5:
        trend = f"Down {abs(pct_1m):.1f}% in the last month."
        sugg = "Prices have dipped 📉—you could snag a bargain now."
    else:
        trend = f"Steady (±5%) in the last month."
        sugg = "Prices look steady 🔄—feel free to buy when you're ready."

    loc = f" in {found_state}" if found_state else ""
    reply = format_reply([
        "Hey there! The latest price for {food}{loc} is ₦{price:.2f}. {trend} {sugg}",
        "Good news! {food} costs ₦{price:.2f}{loc}. {trend} {sugg}",
        "Here's the update: ₦{price:.2f} is current for {food}{loc}. {trend} {sugg}"
    ],
        food=found_food,
        loc=loc,
        price=latest_price,
        trend=trend,
        sugg=sugg
    )
    reply += "\n\nData source: Nigeria Food Price Tracking Dataset from the National Bureau of Statistics."
    return {"reply": reply}