
from fastapi import APIRouter
from fastapi.responses import JSONResponse
import pandas as pd
import os
from functools import lru_cache

router = APIRouter()

# Get the absolute path of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(script_dir, '..', 'FoodPrices_Dataset.csv')

@lru_cache(maxsize=1)
def _load_df():
    return pd.read_csv(DATA_PATH, parse_dates=['Date'], dayfirst=True)

def get_info():
    df = _load_df()
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
