from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import datetime
import regex as re
import os
import random

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

    # Extract entities
    found_food  = next((f for f in foods  if f.lower() in text), None)
    found_state = next((s for s in states if s.lower() in text), None)

    # Help fallback
    if "help" in text or "usage" in text:
        return {"reply": format_reply([
            "No worries—I can help! Try: “price of maize white in Lagos” or “predict price of beans in Abuja 3 months.”",
            "I'm here for you! You could ask: “price of yam in Kano” or just type “help” for more tips.",
            "Feel free to say something like “price of garri in Lokoja” or type “help” if you're stuck."
        ])}

    # Missing food fallback
    if not found_food:
        return {"reply": format_reply([
            "Hmm, I’m not seeing that food item. Try: “price of rice in Lagos.”",
            "Oops, I didn’t catch the food name. How about: “price of beans in Abuja”?",
            "I’m not familiar with that item. Try: “price of maize in Kano.”"
        ])}

    # Filter dataset
    df_item = df_raw[df_raw["Food Item"] == found_food]
    if found_state:
        df_item = df_item[df_item["State"] == found_state]

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

    # Suggestion
    if pct_1m >  5:  sugg = "Prices are climbing 📈—it might be smart to buy soon."
    elif pct_1m < -5: sugg = "Prices have dipped 📉—you could snag a bargain now."
    else:            sugg = "Prices look steady 🔄—feel free to buy when you're ready."

    # Reply templates
    reply = format_reply([
        "Hey there! The latest price for {food}{loc} is **₦{price:.2f}**. {sugg}",
        "Good news! {food} costs **₦{price:.2f}**{loc}. {sugg}",
        "Here's the update: **₦{price:.2f}** is current for {food}{loc}. {sugg}"
    ],
        food  = found_food,
