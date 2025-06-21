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
