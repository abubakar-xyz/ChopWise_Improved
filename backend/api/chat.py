"""
Chat API - Handles chat interactions, session management, and calls the chatbot service.
"""
import logging
import uuid
from fastapi import APIRouter, Cookie, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from services.chatbot_service import generate_chatbot_response

router = APIRouter()
logger = logging.getLogger(__name__)

class Message(BaseModel):
    """A single message in the chat history."""
    user: str = Field(..., description="The user's message.")
    bot: str = Field(..., description="The bot's response.")

class ChatRequest(BaseModel):
    """Request model for the chat endpoint."""
    session_id: Optional[str] = None
    messages: List[Message] = Field(..., description="The history of messages in the chat.")

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, session_id: Optional[str] = Cookie(None)):
    """
    Handles a chat request, generates a response, and manages session state.
    """
    # 1. Determine session ID
    sid = session_id or request.session_id or str(uuid.uuid4())
    
    # 2. Extract the last user message from the history
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")
    
    # 3. Generate a response using the chatbot service
    try:
        response = generate_chatbot_response(sid, request.messages)
        return JSONResponse({"reply": response, "session_id": sid})
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        return JSONResponse(
            {"reply": "Sorry, something went wrong. Please try again.", "session_id": sid},
            status_code=500,
        )