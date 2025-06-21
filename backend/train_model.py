import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import pickle

def load_data(path='FoodPrices_Dataset.csv'):
    df = pd.read_csv(path, parse_dates=['Date'], dayfirst=True)
    df = pd.get_dummies(df, columns=['State','LGA','Food Item','Category'])
    df['day'] = df['Date'].dt.day
    df['month'] = df['Date'].dt.month
    df['year'] = df['Date'].dt.year
    return df

if __name__ == '__main__':
    df = load_data()
    y = df['UPRICE']
    X = df.drop(columns=['Date','Outlet Type','Country','Sector','Price','UPRICE'])
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    with open('model.pkl', 'wb') as f:
        pickle.dump((model, X.columns.tolist()), f)
    print('Model trained and saved to model.pkl')
