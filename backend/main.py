from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import datetime
import regex as re
import os
import random

app = FastAPI()
os.chdir(os.path.dirname(__file__))

# Load model + features + raw data
model = joblib.load('model.pkl')
feature_cols = joblib.load('features.pkl')
df_raw = pd.read_csv('FoodPrices_Dataset.csv', parse_dates=['Date'], dayfirst=True)

class Request(BaseModel):
    message: str

# Helper to pick a random template
def format_reply(templates, **kwargs):
    return random.choice(templates).format(**kwargs)

@app.post('/chat')
def chat(req: Request):
    text = req.message.lower()
    foods = df_raw['Food Item'].unique()
    states = df_raw['State'].unique()

    found_food = next((f for f in foods if f.lower() in text), None)
    found_state = next((s for s in states if s.lower() in text), None)

    # Help templates
    help_templates = [
        "No worries—I can help! Try: “price of maize white in Lagos” or “predict price of beans in Abuja 3 months.”",
        "I'm here for you! You could ask: “price of yam in Kano” or “help” for more tips.",
        "Feel free to say something like “price of garri in Lokoja” or just type “help” if you're stuck."
    ]

    if 'help' in text or 'usage' in text:
        return {'reply': format_reply(help_templates)}

    if not found_food:
        return {'reply': format_reply([
            "Hmm, I’m not seeing that food item. Try another—for example: “price of rice in Lagos.”",
            "Oops, I didn’t catch the food name. How about: “price of beans in Abuja”?",
            "I’m not familiar with that item yet. Try asking: “price of maize in Kano.”"
        ])}

    # Filter for the item/state
    df_item = df_raw[df_raw['Food Item'] == found_food]
    if found_state:
        df_item = df_item[df_item['State'] == found_state]

    # Get latest price
    latest_date = df_item['Date'].max()
    latest_price = df_item[df_item['Date'] == latest_date]['UPRICE'].mean()

    # Compute trends
    one_month_ago = latest_date - pd.Timedelta(days=30)
    three_months_ago = latest_date - pd.Timedelta(days=90)
    recent_1m = df_item[df_item['Date'] >= one_month_ago]['UPRICE']
    recent_3m = df_item[df_item['Date'] >= three_months_ago]['UPRICE']
    avg_1m = recent_1m.mean() if not recent_1m.empty else latest_price
    avg_3m = recent_3m.mean() if not recent_3m.empty else latest_price
    pct_1m = (latest_price - avg_1m) / avg_1m * 100 if avg_1m else 0

    # Suggestion logic
    if pct_1m > 5:
        sugg = "Prices are climbing 📈—it might be smart to buy soon."
    elif pct_1m < -5:
        sugg = "Prices have dipped 📉—you could snag a bargain now."
    else:
        sugg = "Prices look steady 🔄—feel free to buy when you're ready."

    # Response templates
    response_templates = [
        "Hey there! The latest price for {food}{loc} is **₦{price:.2f}**. {sugg}",
        "Good news! {food} costs **₦{price:.2f}**{loc}. {sugg}",
        "Here's the update: **₦{price:.2f}** is the current price for {food}{loc}. {sugg}"
    ]

    return {
        'reply': format_reply(
            response_templates,
            food=found_food,
            loc=f" in {found_state}" if found_state else "",
            price=latest_price,
            sugg=sugg
        )
    }

@app.post('/predict')
def predict(req: Request):
    text = req.message.lower()
    m = re.search(r'(\d+)\s*month', text)
    months = int(m.group(1)) if m else 1

    foods = df_raw['Food Item'].unique()
    states = df_raw['State'].unique()
    found_food = next((f for f in foods if f.lower() in text), foods[0])
    found_state = next((s for s in states if s.lower() in text), states[0])

    # Build future features
    future = datetime.datetime.today() + datetime.timedelta(days=30 * months)
    base = {'day': future.day, 'month': future.month, 'year': future.year}
    row = pd.DataFrame([base])
    for col in feature_cols:
        row[col] = 0
    sc = f"State_{found_state}"
    fc = f"Food Item_{found_food}"
    if sc in feature_cols: row[sc] = 1
    if fc in feature_cols: row[fc] = 1

    price = model.predict(row[feature_cols])[0]

    predict_templates = [
        "🔮 In {m} month(s), {food}{loc} should be around ₦{price:.2f}. Plan ahead!",
        "Forecast: after {m} month(s), expect **₦{price:.2f}** for {food}{loc}.",
        "Looking ahead {m} month(s), estimated price for {food}{loc} is ₦{price:.2f}."
    ]

    return {
        'reply': format_reply(
            predict_templates,
            m=months,
            food=found_food,
            loc=f" in {found_state}" if found_state else "",
            price=price
        )
    }
