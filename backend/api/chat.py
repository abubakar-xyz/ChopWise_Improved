



# --- State-of-the-art, lightweight transformer-based chatbot ---
import logging
import uuid
from fastapi import APIRouter, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from services.llm import extract_entities, detect_intent, generate_response

router = APIRouter()
logger = logging.getLogger(__name__)

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, session_id: Optional[str] = Cookie(None)):
    sid = session_id or request.session_id or str(uuid.uuid4())
    logger.info(f"Chat request: {request.message} (session: {sid})")
    try:
        entities = extract_entities(request.message)
        intent = detect_intent(request.message)
        reply = generate_response(intent, entities)
        return JSONResponse({"reply": reply, "session_id": sid})
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return JSONResponse({"reply": "Sorry, something went wrong. Please try again.", "session_id": sid}, status_code=500)
