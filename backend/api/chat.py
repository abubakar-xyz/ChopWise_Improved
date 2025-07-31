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
    sid = session_id or request.session_id or str(uuid.uuid4())
    user_messages = request.messages
    logger.info(f"Received chat request: session_id={sid}, messages={user_messages}")
    try:
        # Optionally: Add model-based logic here (e.g., price prediction)
        llm_reply = await call_llm(user_messages)
        return JSONResponse({
            "reply": llm_reply,
            "session_id": sid
        })
    except Exception as e:
        logger.error(f"/chat endpoint error: {e}", exc_info=True)
        return JSONResponse({"detail": "Internal server error"}, status_code=500)
