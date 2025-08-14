"""
Chat API - Handles chat interactions, session management, and calls the chatbot service.
"""
import logging
import uuid
from fastapi import APIRouter, Cookie, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
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

    @field_validator('messages')
    @classmethod
    def limit_messages(cls, v: List[Message]):  # type: ignore
        # Keep only last 10 to bound processing cost
        return v[-10:]

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
        # Ensure messages are plain dicts for downstream services
        plain_messages = [{"user": m.user, "bot": m.bot} for m in request.messages]
        response = generate_chatbot_response(sid, plain_messages)
        return JSONResponse({"reply": response, "session_id": sid})
    except Exception as e:
        logger.error(f"Chat error for session {sid}: {e}", exc_info=True)
        return JSONResponse(
            {"reply": "Sorry, something went wrong. Please try again.", "session_id": sid},
            status_code=500,
        )