<div align="center">
  <img src="https://github.com/user-attachments/assets/4f62172e-9c94-48b8-b658-042ff3c88dc8" alt="ChopWise UI" width="600" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
  <p><em>ChopWise UI showing price prediction interface</em></p>
</div>

# ChopWise - Improved NLP & UI

## Overview
ChopWise helps you query current and future food prices in Nigeria.


### Usage
- **Chat**: “price of maize white in Lagos”
- **Predict**: “predict price of beans in Abuja 3 months”
- **Help**: Type “help”

## Deploy on Render

### Frontend (Static Export)
1. Build Command: `cd frontend && npm install && npm run build`
2. Publish Directory: `frontend/out`
3. Env: `NEXT_PUBLIC_BACKEND_URL` → your backend base (include `/api` only if you host backend without the `/api` prefix)
4. Netlify: `netlify.toml` already sets base/publish and SPA redirect.

### Backend (Web Service)
1. **Runtime**: Python 3.12 (see `backend/runtime.txt`)
2. **Build Command**: `pip install -r requirements.txt && python train_model.py`
3. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8000`
4. CORS: set `ALLOWED_ORIGIN_REGEX` to match your frontend origin. Custom headers `X-Request-ID` and `X-Session-ID` are allowed by default.

### API Contract
- POST `/api/chat` body:
```
{
	"session_id": "<uuid-or-null>",
	"messages": [ { "user": "text", "bot": "" } ]
}
```
- Response: `{ "reply": "string", "session_id": "uuid" }`
