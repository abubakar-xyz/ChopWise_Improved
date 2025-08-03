
"""
RAG Service: Orchestrates the Retrieval-Augmented Generation pipeline.

This service integrates entity extraction, intent detection, price prediction,
and response generation to provide a comprehensive answer to user queries.
It maintains a conversational history to provide context-aware responses.
"""
import logging
from typing import List, Dict, Any
from services.llm import (
    extract_entities,
    detect_intent,
    get_price_prediction,
    generate_response as generate_llm_response,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory cache for chat histories (replace with a persistent store in production)
chat_histories: Dict[str, List[Dict[str, str]]] = {}

def process_chat_message(session_id: str, messages: List[Dict[str, str]]) -> str:
    """
    Processes a chat message, orchestrating the RAG pipeline.
    """
    if not messages:
        return "I'm sorry, but I didn't receive a message. Could you please try again?"

    # Get the last user message
    last_user_message = messages[-1]["user"]

    # 1. Extract entities
    entities = extract_entities(last_user_message)
    
    # 2. Detect intent
    intent = detect_intent(last_user_message)
    
    # 3. Retrieve data if necessary (e.g., price prediction)
    retrieved_data = None
    if intent == "price_query" and entities.get("FOOD") and entities.get("GPE"):
        try:
            prediction_data = {
                "food_item": entities["FOOD"],
                "lga": entities["GPE"],
            }
            retrieved_data = get_price_prediction(prediction_data)
        except Exception as e:
            logger.error(f"Price prediction failed: {e}", exc_info=True)
            return "I couldn't fetch the price for that item. Please ensure the food item and location are correct."

    # 4. Generate a human-like response
    response = generate_llm_response(intent, entities, retrieved_data)
    
    # 5. Update and store conversation history
    if session_id not in chat_histories:
        chat_histories[session_id] = []
    
    chat_histories[session_id].append({"user": last_user_message, "bot": response})
    
    return response
