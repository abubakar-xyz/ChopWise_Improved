from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import pickle
import datetime
import regex as re

app = FastAPI()

# Load model + feature columns
model, feature_cols = pickle.load(open('model.pkl','rb'))
df_raw = pd.read_csv('FoodPrices_Dataset.csv', parse_dates=['Date'], dayfirst=True)

class Request(BaseModel):
    message: str

@app.post('/chat')
def chat(req: Request):
    text = req.message.lower()
    foods = df_raw['Food Item'].unique()
    states = df_raw['State'].unique()
    # Extract entities
    found_food = next((f for f in foods if f.lower() in text), None)
    found_state = next((s for s in states if s.lower() in text), None)
    if found_food:
        df_f = df_raw[df_raw['Food Item']==found_food]
        if found_state:
            df_fs = df_f[df_f['State']==found_state]
            avg = df_fs['UPRICE'].mean()
            return {'reply': f'Average price for {found_food} in {found_state} is ₦{avg:,.2f}.'}
        avg = df_f['UPRICE'].mean()
        return {'reply': f'Current average price for {found_food} is ₦{avg:,.2f}. Specify state for more detail.'}
    if 'help' in text or 'usage' in text:
        return {'reply': 'Ask: "price of maize white in Lagos" or "predict price of beans in Abuja 3 months".'}
    return {'reply': 'Sorry, I didn’t catch that. Type "help" for examples.'}

@app.post('/predict')
def predict(req: Request):
    text = req.message.lower()
    m = re.search(r'(\d+)\s*month', text)
    months = int(m.group(1)) if m else 1
    foods = df_raw['Food Item'].unique()
    states = df_raw['State'].unique()
    found_food = next((f for f in foods if f.lower() in text), foods[0])
    found_state = next((s for s in states if s.lower() in text), states[0])

    future = datetime.datetime.today() + datetime.timedelta(days=30*months)
    rec = {'day': future.day, 'month': future.month, 'year': future.year}
    row = pd.DataFrame([rec])
    for col in feature_cols:
        row[col] = 0
    # set one-hot
    row[f'State_{found_state}'] = 1
    row[f'Food Item_{found_food}'] = 1
    price = model.predict(row[feature_cols])[0]
    return {'reply': f'Predicted price for {found_food} in {found_state} after {months} month(s) is ₦{price:,.2f}.'}
