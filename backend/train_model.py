import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import pickle
import os

def load_data(path='FoodPrices_Dataset.csv'):
    # 1) Read CSV with date parsing
    df = pd.read_csv(path, parse_dates=['Date'], dayfirst=True)

    # 2) Extract simple date features
    df['day']   = df['Date'].dt.day
    df['month'] = df['Date'].dt.month
    df['year']  = df['Date'].dt.year

    # 3) Identify all categorical (object‑dtype) columns
    categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
    # Exclude the target
    categorical_cols = [c for c in categorical_cols if c != 'UPRICE']

    # 4) One‑hot encode them
    df = pd.get_dummies(df, columns=categorical_cols, drop_first=True)

    return df

if __name__ == '__main__':
    # Ensure we're in the backend directory
    os.chdir(os.path.dirname(__file__))

    # Load & preprocess
    df = load_data()

    # Separate features & target
    y = df['UPRICE']
    X = df.drop(columns=['UPRICE', 'Date'])  # keep Date drop for clarity

    # Train the model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    # Save both model and feature‑column list
    with open('model.pkl', 'wb') as f:
        pickle.dump({
            'model': model,
            'feature_columns': X.columns.tolist()
        }, f)

    print('✅ Model trained and saved to model.pkl')
