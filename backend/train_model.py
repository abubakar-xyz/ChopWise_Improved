import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import pickle

def load_data(path='FoodPrices_Dataset.csv'):
    df = pd.read_csv(path, parse_dates=['Date'], dayfirst=True)
    # Identify all columns we want to encode
    cols_to_encode = ['State', 'LGA', 'Food Item', 'Category']
    
    # Filter out any that are missing
    cols_existing = [col for col in cols_to_encode if col in df.columns]
    
    # Apply one-hot encoding
    df = pd.get_dummies(df, columns=cols_existing)

    df['day'] = df['Date'].dt.day
    df['month'] = df['Date'].dt.month
    df['year'] = df['Date'].dt.year
    return df

if __name__ == '__main__':
    df = load_data()
    y = df['UPRICE']
    
    cols_to_drop = ['Date', 'Outlet Type', 'Country', 'Sector', 'Price', 'UPRICE']
    cols_existing = [col for col in cols_to_drop if col in df.columns]
    
    X = df.drop(columns=cols_existing)
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    with open('model.pkl', 'wb') as f:
        pickle.dump((model, X.columns.tolist()), f)
    print('Model trained and saved to model.pkl')
