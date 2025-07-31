import logging
import uuid
import os
import joblib
import pandas as pd
import httpx
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()
logger = logging.getLogger(__name__)

# Load model and features at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'model.pkl')
FEATURES_PATH = os.path.join(os.path.dirname(__file__), '..', 'features.pkl')
model = None
features = None
try:
    model = joblib.load(MODEL_PATH)
    features = joblib.load(FEATURES_PATH)
    logger.info("Model and features loaded successfully.")
except Exception as e:
    logger.error(f"Failed to load model/features: {e}")

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]]
    session_id: Optional[str] = None

async def call_llm(messages: List[Dict[str, Any]]) -> str:
    """Call the Groq LLM API with the conversation history."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY not set in environment.")
        return "LLM API key not configured."
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": "llama3-8b-8192",  # or your preferred model
        "messages": messages,
        "max_tokens": 256,
        "temperature": 0.7
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"LLM API call failed: {e}")
        return "Sorry, I couldn't process your request right now."

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, session_id: Optional[str] = Cookie(None)):
    """
    Enhanced /chat endpoint:
    - Accepts a list of chat messages and optional session_id.
    - If the last user message contains structured data for price prediction, returns a model prediction alongside the LLM reply.
    - All errors are logged; endpoint is resilient to model or LLM failures.
    - Response includes both the LLM reply and (if available) the model prediction.
    """
    sid = session_id or request.session_id or str(uuid.uuid4())
    user_messages = request.messages
    logger.info(f"Received chat request: session_id={sid}, messages={user_messages}")
    try:
        # --- Model-based logic: Example for price prediction ---
        model_prediction = None
        try:
            # If the last user message contains a price query, attempt prediction
            last_user_msg = next((m for m in reversed(user_messages) if m.get("role") == "user"), None)
            if last_user_msg and model and features:
                # Example: Expecting structured input for prediction
                user_data = last_user_msg.get("data")
                if user_data:
                    # user_data should be a dict with feature keys
                    input_df = pd.DataFrame([user_data])
                    input_df = input_df.reindex(columns=features, fill_value=0)
                    model_prediction = model.predict(input_df)[0]
        except Exception as e:
            logger.warning(f"Model prediction failed: {e}")
            model_prediction = None

        # --- LLM logic ---
        llm_reply = await call_llm(user_messages)

        response = {
            "reply": llm_reply,
            "session_id": sid
        }
        if model_prediction is not None:
            response["model_prediction"] = model_prediction
        return JSONResponse(response)
    except Exception as e:
        logger.error(f"/chat endpoint error: {e}", exc_info=True)
        return JSONResponse({"detail": "Internal server error"}, status_code=500)
