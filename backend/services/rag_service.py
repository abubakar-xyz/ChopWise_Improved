
"""
RAG Service: Orchestrates the Retrieval-Augmented Generation pipeline.

This service integrates entity extraction, intent detection, price prediction,
and response generation to provide a comprehensive answer to user queries.
It maintains a conversational history to provide context-aware responses.
"""
import logging
import time
import uuid
from typing import List, Dict, Any, Tuple, Optional
from services.llm import (
    extract_entities,
    detect_intent,
    get_price_prediction,
    generate_response as generate_llm_response,
    get_price_comparison,
    get_price_trend,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory cache for chat histories (replace with a persistent store in production)
chat_histories: Dict[str, List[Dict[str, str]]] = {}

# Cache for price predictions (food_item,lga) -> (timestamp, data)
_prediction_cache: Dict[Tuple[str, str], Tuple[float, Dict[str, str]]] = {}
_PREDICTION_TTL = 300  # seconds

MAX_HISTORY = 10  # cap per session to bound memory

def _trim_history(session_id: str):
    if session_id in chat_histories and len(chat_histories[session_id]) > MAX_HISTORY:
        chat_histories[session_id] = chat_histories[session_id][-MAX_HISTORY:]

def _prepare_messages(messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    # Normalize and filter out empty user entries; support dicts or objects (e.g., Pydantic models)
    cleaned = []
    for m in messages:
        if isinstance(m, dict):
            user_val = m.get("user")
            bot_val = m.get("bot")
        else:
            user_val = getattr(m, "user", None)
            bot_val = getattr(m, "bot", None)
        if user_val and isinstance(user_val, str):
            cleaned.append({"user": user_val.strip(), "bot": (bot_val or "").strip()})
    return cleaned[-MAX_HISTORY:]

def _validate_or_new_session_id(session_id: str) -> str:
    try:
        uuid.UUID(session_id)
        return session_id
    except Exception:
        return uuid.uuid4().hex

def _cached_price(food_item: str, lga: str) -> Optional[Dict[str, str]]:
    key = (food_item, lga)
    entry = _prediction_cache.get(key)
    now = time.time()
    if entry and (now - entry[0]) < _PREDICTION_TTL:
        return entry[1]
    try:
        data = get_price_prediction({"food_item": food_item, "lga": lga})
        _prediction_cache[key] = (now, data)
        return data
    except Exception as e:
        logger.error(f"Prediction cache miss compute failure: {e}", exc_info=True)
        return None

def process_chat_message(session_id: str, messages: List[Dict[str, str]]) -> str:
    """Main RAG orchestrator returning a user-facing string response."""
    session_id = _validate_or_new_session_id(session_id)
    messages = _prepare_messages(messages)
    if not messages:
        return "I didn't receive anything to process. Please type your question about food prices."

    last_user_message = messages[-1]["user"]

    # 1. Extract entities / 2. Detect intent
    entities = extract_entities(last_user_message)
    intent = detect_intent(last_user_message)

    # 3. Retrieve data if necessary (e.g., price prediction)
    retrieved_data = None
    if intent == "price_query":
        if entities.get("FOOD") and entities.get("GPE"):
            target_lga = entities["GPE"][0] if isinstance(entities["GPE"], list) else entities["GPE"]
            retrieved_data = _cached_price(entities["FOOD"], target_lga)
            if not retrieved_data:
                return "I couldn't fetch the price for that item. Please ensure the food item and location are correct."
        else:
            return "To get a price, please tell me the food item and the location (LGA)."

    # 4. Generate a human-like response
    if intent == "comparison_query" and entities.get("FOOD") and isinstance(entities.get("GPE"), list) and len(entities.get("GPE")) > 1:
        response = get_price_comparison(entities["FOOD"], entities["GPE"])
    elif intent == "trend_query" and entities.get("FOOD") and entities.get("GPE"):
        if isinstance(entities["GPE"], list) and len(entities["GPE"]) > 1:
            first_location = entities["GPE"][0]
            response = get_price_trend(entities["FOOD"], first_location)
            response += "\n\nNote: I can only provide a trend for one location at a time."
        else:
            location = entities["GPE"][0] if isinstance(entities["GPE"], list) else entities["GPE"]
            response = get_price_trend(entities["FOOD"], location)
    else:
        response = generate_llm_response(intent, entities, retrieved_data)

    # 5. Update and store conversation history
    if session_id not in chat_histories:
        chat_histories[session_id] = []
    chat_histories[session_id].append({"user": last_user_message, "bot": response, "intent": intent, "entities": entities})
    _trim_history(session_id)

    return response
