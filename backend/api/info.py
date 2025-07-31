
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import pandas as pd
import os

router = APIRouter()

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'FoodPrices_Dataset.csv')

def get_info():
    df = pd.read_csv(DATA_PATH, parse_dates=['Date'], dayfirst=True)
    foods = sorted(df['Food Item'].dropna().unique().tolist())
    states = sorted(df['State'].dropna().unique().tolist())
    lgas = sorted(df['LGA'].dropna().unique().tolist())
    outlets = sorted(df['Outlet Type'].dropna().unique().tolist())
    date_range = {
        "start": str(df['Date'].min().date()),
        "end": str(df['Date'].max().date())
    }
    return {
        "foods": foods,
        "states": states,
        "lgas": lgas,
        "outlets": outlets,
        "date_range": date_range
    }

@router.get("/info")
async def info():
    try:
        info = get_info()
        return JSONResponse(info)
    except Exception as e:
        return JSONResponse({"detail": f"Failed to load info: {e}"}, status_code=500)
