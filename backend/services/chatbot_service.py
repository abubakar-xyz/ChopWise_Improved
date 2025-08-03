
import logging
from typing import List, Dict
from services.rag_service import process_chat_message

logger = logging.getLogger(__name__)

def generate_chatbot_response(session_id: str, messages: List[Dict[str, str]]) -> str:
    """
    Forwards the chat request to the RAG service to get a contextual response.
    """
    try:
        # Process the message using the RAG service
        response = process_chat_message(session_id, messages)
        return response
    except Exception as e:
        logger.error(f"Error in chatbot service: {e}", exc_info=True)
        return "I'm having trouble connecting to my brain right now. Please try again in a moment."
