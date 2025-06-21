# ChopWise - Improved NLP & UI

## Overview
ChopWise helps you query current and future food prices in Nigeria.

### Usage
- **Chat**: “price of maize white in Lagos”
- **Predict**: “predict price of beans in Abuja 3 months”
- **Help**: Type “help”

## Deploy on Render

### Frontend (Static Site)
1. **Build Command**: `cd frontend && npm install && npm run build`
2. **Publish Directory**: `frontend/.next`
3. **Env**: `BACKEND_URL` → your backend URL

### Backend (Web Service)
1. **Runtime**: Python 3.10+
2. **Build Command**: `pip install -r requirements.txt && python train_model.py`
3. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8000`
4. **No additional env vars**