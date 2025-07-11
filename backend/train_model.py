import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

def load_data(path='FoodPrices_Dataset.csv'):
    df = pd.read_csv(path, parse_dates=['Date'], dayfirst=True)
    df['day']   = df['Date'].dt.day
    df['month'] = df['Date'].dt.month
    df['year']  = df['Date'].dt.year

    # One‑hot‑encode all categorical columns
    cats = df.select_dtypes(include=['object']).columns.tolist()
    cats = [c for c in cats if c != 'UPRICE']
    df = pd.get_dummies(df, columns=cats, drop_first=True)
    return df

if __name__ == '__main__':
    os.chdir(os.path.dirname(__file__))

    df = load_data()
    y = df['UPRICE']
    X = df.drop(columns=['UPRICE', 'Date'])

    # Lighter forest: fewer, smaller trees
    model = RandomForestRegressor(
        n_estimators=30,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X, y)

    # Compress and save
    joblib.dump(model, 'model.pkl', compress=3)
    # Also save feature list
    joblib.dump(X.columns.tolist(), 'features.pkl', compress=3)

    print('✅ Trained & saved compressed model (30 trees, depth≤10).')

# --- Requirements for production deployment ---
# Ensure all required packages are listed in requirements.txt
# Add httpx (for Groq API calls)
# Add scikit-learn, pandas, joblib, fastapi, uvicorn, regex, etc.

# requirements.txt (add these lines if missing):
# fastapi
# uvicorn
# pandas
# scikit-learn
# joblib
# regex
# httpx
# starlette

# --- If requirements.txt is missing httpx, add it ---
# You can run: pip install httpx
# Or add 'httpx' to requirements.txt and redeploy

# --- For Render deployment ---
# 1. Ensure requirements.txt is up to date
# 2. Add httpx to requirements.txt
# 3. Redeploy on Render
# 4. Confirm build log shows httpx installed
# 5. Test /chat endpoint from frontend

# --- If you want to automate this, here is the requirements.txt update ---
# (This is a comment for your reference)
# fastapi
# uvicorn
# pandas
# scikit-learn
# joblib
# regex
# httpx
# starlette
# ...other dependencies as needed...
