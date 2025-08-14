"""
LLM Service: Handles all AI-related tasks including entity extraction, 
intent detection, response generation, and price prediction.
"""
import logging
import joblib
import pandas as pd
import os
import re
from fuzzywuzzy import process, fuzz
from functools import lru_cache
try:
    from sentence_transformers import SentenceTransformer, util  # type: ignore
except Exception:  # pragma: no cover
    SentenceTransformer = None  # type: ignore
    util = None  # type: ignore

# --- Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the absolute path of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))

# --- Load Models and Data (lazy + offline-friendly) ---
try:
    # Ensure HF cache dir is writable if provided
    os.environ.setdefault("HF_HOME", os.path.join("/tmp", "hf"))
    os.environ.setdefault("TRANSFORMERS_CACHE", os.environ["HF_HOME"])

    # Load tabular ML artifacts
    model = joblib.load(os.path.join(script_dir, "..", "model.pkl"))
    features = joblib.load(os.path.join(script_dir, "..", "features.pkl"))

    # Load the dataset for entity matching
    df = pd.read_csv(os.path.join(script_dir, "..", "FoodPrices_Dataset.csv"))
    # Drop NA and ensure strings to avoid fuzzy matching errors
    FOOD_ITEMS = df["Food Item"].dropna().astype(str).unique().tolist()
    LGAS = df["LGA"].dropna().astype(str).unique().tolist()
    STATES = df["State"].dropna().astype(str).unique().tolist()
    # Precompute lowercase lookup maps
    _LGAS_LOWER = {l.lower(): l for l in LGAS}
    _STATES_LOWER = {s.lower(): s for s in STATES}
    _STATE_TO_LGAS = {
        state: sorted(set(df.loc[df["State"] == state, "LGA"].dropna().astype(str).tolist()))
        for state in STATES
    }

    # Lazy init for embedder (small, fast model)
    _EMBEDDER = None
    INTENT_CANDIDATES = [
        "price_query", "trend_query", "comparison_query",
        "greeting", "help", "thank_you", "about"
    ]

    def get_embedder():
        global _EMBEDDER
        if _EMBEDDER is None and SentenceTransformer is not None:
            try:
                _EMBEDDER = SentenceTransformer(os.environ.get("SENTENCE_TRANSFORMERS_MODEL", "all-MiniLM-L6-v2"))
            except Exception as e:
                logger.error(f"Failed to initialize sentence embedder: {e}", exc_info=True)
                raise
        return _EMBEDDER

except FileNotFoundError as e:
    logger.error(f"Error loading a critical file: {e}", exc_info=True)
    raise RuntimeError(f"Could not load critical model or data file: {e}") from e
except Exception as e:
    logger.error(f"An unexpected error occurred during model or data loading: {e}", exc_info=True)
    raise RuntimeError(f"An unexpected error occurred during model or data loading: {e}") from e

# --- Core Functions ---

STOPWORDS = {
    "in", "of", "the", "on", "at", "for", "to", "and", "a", "an",
    "is", "are", "was", "were", "please", "me", "about", "how", "much",
    "price", "cost", "naira", "₦", "cheaper", "compare"
}

def extract_entities(text: str) -> dict:
    """
    Extracts food items and locations from text using NER and fuzzy matching.
    """
    entities = {"FOOD": None, "GPE": [], "STATE": None}

    try:
        low = text.lower()
        tokens = [t.strip(",.?! ") for t in text.split() if t.strip()]
        tokens = [t for t in tokens if t.isalpha() and len(t) >= 3 and t.lower() not in STOPWORDS]

        # FOOD: prefer full-text fuzzy on item vocab, then substring
        try:
            fmatch = process.extractOne(text, FOOD_ITEMS, scorer=fuzz.token_set_ratio)
            if fmatch and fmatch[1] >= 75:
                entities["FOOD"] = fmatch[0]
        except Exception:
            pass
        if not entities["FOOD"]:
            for food in FOOD_ITEMS:
                if food.lower() in low:
                    entities["FOOD"] = food
                    break

        # STATE detection (helps ask for LGA if only state provided)
        for tok in tokens:
            st = _STATES_LOWER.get(tok.lower())
            if st:
                entities["STATE"] = st
                break

        # LGA detection
        # Define candidate LGA list (filter by state if present later)
        lga_vocab = LGAS

        # 1) Direct substring matches against full LGA vocab for recall
        for lga_lower, lga in _LGAS_LOWER.items():
            if lga_lower in low and lga not in entities["GPE"]:
                entities["GPE"].append(lga)

        # 2) Try phrase after 'in ...'
        if not entities["GPE"]:
            after_in = re.findall(r"\bin\s+([a-zA-Z\s\-]+)", low)
            for phrase in after_in:
                # If phrase is a state, record it and skip LGA match
                st = _STATES_LOWER.get(phrase.strip().lower())
                if not st:
                    sm = process.extractOne(phrase, STATES, scorer=fuzz.token_set_ratio)
                    if sm and sm[1] >= 92:
                        st = sm[0]
                if st and not entities["STATE"]:
                    entities["STATE"] = st
                    continue
                # Otherwise try to match LGA using token_set_ratio
                # If state known, restrict vocabulary
                lga_vocab = _STATE_TO_LGAS.get(entities["STATE"], LGAS) if entities["STATE"] else LGAS
                lmatch = process.extractOne(phrase, lga_vocab, scorer=fuzz.token_set_ratio)
                if lmatch and lmatch[1] >= 85 and lmatch[0] not in entities["GPE"]:
                    entities["GPE"].append(lmatch[0])

        # 3) As a last resort, full text fuzzy vs LGA list (token_set_ratio)
        # If a state is provided but no LGA detected, do NOT guess an LGA.
        if not entities["GPE"] and not entities.get("STATE"):
            lmatch = process.extractOne(text, LGAS, scorer=fuzz.token_set_ratio)
            if lmatch and lmatch[1] >= 90:
                entities["GPE"].append(lmatch[0])

    except Exception as e:
        logger.error(f"Entity extraction failed: {e}", exc_info=True)

    logger.info(f"Extracted entities: {entities}")
    return entities

def get_lgas_for_state(state: str) -> list:
    """Return list of LGAs for a given state name (case-insensitive)."""
    if not state:
        return []
    st = _STATES_LOWER.get(state.lower())
    if not st:
        # Try fuzzy match
        sm = process.extractOne(state, STATES, scorer=fuzz.token_set_ratio)
        if sm and sm[1] >= 92:
            st = sm[0]
        else:
            return []
    return _STATE_TO_LGAS.get(st, [])

@lru_cache(maxsize=128)
def detect_intent(text: str) -> str:
    """
    Detects the user's intent from the text, with caching.
    """
    try:
        # Simple heuristics first for speed
        low = text.lower()
        if any(k in low for k in ["compare", "vs", "which is cheaper", "cheapest in"]):
            return "comparison_query"
        if any(k in low for k in ["trend", "increase", "decrease", "forecast", "next month", "next week"]):
            return "trend_query"
        if any(k in low for k in ["price", "cost", "how much", "naira", "₦"]):
            return "price_query"
        # If a known food appears, default to price intent
        if any(f.lower() in low for f in FOOD_ITEMS):
            return "price_query"
        if any(k in low for k in ["hello", "hi", "hey"]):
            return "greeting"
        if "help" in low:
            return "help"
        if any(k in low for k in ["thanks", "thank you"]):
            return "thank_you"

        # Fallback to embedding similarity for general cases
        embedder = get_embedder()
        if embedder and util:
            cand_texts = [
                "ask price of a food item in a location",
                "ask about trend or forecast for a food item in a location",
                "compare prices of a food item across multiple locations",
                "greeting message",
                "ask for help or usage",
                "say thank you",
                "ask about the assistant",
            ]
            text_emb = embedder.encode([text], convert_to_tensor=True)
            cand_emb = embedder.encode(cand_texts, convert_to_tensor=True)
            sims = util.cos_sim(text_emb, cand_emb)[0].tolist()
            best_idx = max(range(len(sims)), key=lambda i: sims[i])
            if sims[best_idx] >= 0.35:
                return INTENT_CANDIDATES[best_idx]
    except Exception as e:
        logger.error(f"Intent classification failed: {e}", exc_info=True)
    
    # Default to a general intent if classification is uncertain
    return "general"

def get_price_prediction(data: dict) -> dict:
    """
    Predicts the price of a food item in a specific LGA.
    """
    try:
        # Build a zero-initialized feature vector aligned with training
        vec = pd.Series(0.0, index=pd.Index(features, name="feature"))

        # Date-derived features used during training
        today = pd.Timestamp.today()
        if 'day' in vec.index:
            vec['day'] = float(today.day)
        if 'month' in vec.index:
            vec['month'] = float(today.month)
        if 'year' in vec.index:
            vec['year'] = float(today.year)

        # Extract provided categories
        food_item = str(data.get("food_item", "")).strip()
        lga = str(data.get("lga", "")).strip()

        # Set one-hot for Food Item (if present in training features)
        if food_item:
            prefix = 'Food Item_'
            for col in vec.index:
                if col.startswith(prefix) and col[len(prefix):] == food_item:
                    vec[col] = 1.0
        # Set one-hot for LGA
        if lga:
            prefix = 'LGA_'
            for col in vec.index:
                if col.startswith(prefix) and col[len(prefix):] == lga:
                    vec[col] = 1.0

        # Predict the price
        predicted_price = float(model.predict(vec.to_frame().T)[0])

        # Forecast for next month using a simple moving average
        # Get the historical data for the food item and LGA
        historical_data = df[(df["Food Item"] == food_item) & (df["LGA"] == lga)]
        if len(historical_data) >= 3:
            # Use the average of the last 3 prices as the forecast
            forecast_price = float(historical_data["UPRICE"].tail(3).mean())
        else:
            # Fallback to a simple percentage increase if there is not enough historical data
            forecast_price = float(predicted_price * 1.02)

        return {
            "food_item": food_item,
            "lga": lga,
            "predicted_price": predicted_price,
            "forecast_price": forecast_price,
        }
    except Exception as e:
        logger.error(f"Price prediction failed: {e}", exc_info=True)
        raise

def generate_response(intent: str, entities: dict, retrieved_data: dict = None) -> str:
    """
    Generates a text response based on the intent, entities, and retrieved data.
    """
    if intent == "price_query":
        food = entities.get("FOOD")
        location = entities.get("GPE")
        
        if not food or not location:
            return f"To get a price for {food or 'a food item'}, please specify a location (LGA). For {location or 'a location'}, please specify a food item."
        
        if retrieved_data:
            return (
                f"The estimated price of {retrieved_data['food_item']} in {retrieved_data['lga']} is ₦{retrieved_data['predicted_price']:.2f}. "
                f"The forecast for next month is ₦{retrieved_data['forecast_price']:.2f}."
            )
        else:
            return "I couldn't fetch the price. Please ensure the food item and location are correct."

    if intent == "greeting":
        return "Hello! I'm ChopWise, your guide to food prices in Nigeria. How can I help you today? You can ask me about food prices, trends, or comparisons."

    if intent == "help":
        return "You can ask me for the price of a food item in a specific location (LGA), for example: 'What is the price of rice in Ikeja?' You can also ask for price trends and comparisons."

    if intent == "trend_query":
        food = entities.get("FOOD")
        location = entities.get("GPE")
        if not food or not location:
            return "To get a price trend, please tell me the food item and the location (LGA)."
        # This will be handled by the get_price_trend function

    if intent == "comparison_query":
        food = entities.get("FOOD")
        locations = entities.get("GPE")
        if not food or not locations or len(locations) < 2:
            return "To compare prices, please tell me the food item and at least two locations (LGAs)."
        # This will be handled by the get_price_comparison function

    if intent == "thank_you":
        return "You're welcome! I'm happy to help."

    if intent == "about":
        return "I am ChopWise, an AI-powered chatbot designed to provide real-time food price information and predictions across Nigeria."

    # Default response for general or unrecognized intents
    return "I'm sorry, I didn't quite understand. Please ask me about food prices in a specific location, or type 'help' for more options."

def get_price_comparison(food_item: str, locations: list) -> str:
    """
    Compares the price of a food item across multiple locations.
    """
    prices = {}
    for location in locations:
        try:
            prediction_data = {
                "food_item": food_item,
                "lga": location,
            }
            retrieved_data = get_price_prediction(prediction_data)
            prices[location] = retrieved_data["predicted_price"]
        except Exception as e:
            logger.error(f"Price prediction failed for {location}: {e}", exc_info=True)
            prices[location] = "N/A"

    if not prices:
        return f"I couldn't fetch the price for {food_item} in the specified locations."

    response = f"Here is the price comparison for {food_item}:\n"
    for location, price in prices.items():
        if isinstance(price, float):
            response += f"- {location}: ₦{price:.2f}\n"
        else:
            response += f"- {location}: {price}\n"

    return response

def get_price_trend(food_item: str, location: str) -> str:
    """
    Provides the price trend for a food item in a specific location.
    """
    historical_data = df[(df["Food Item"] == food_item) & (df["LGA"] == location)]
    if historical_data.empty:
        return f"I couldn't find any historical price data for {food_item} in {location}."

    # Get the last 3 months of data
    historical_data["Date"] = pd.to_datetime(historical_data["Date"])
    last_3_months = historical_data[historical_data["Date"] > (pd.to_datetime("today") - pd.DateOffset(months=3))]

    if len(last_3_months) < 2:
        return f"There is not enough historical data to determine a trend for {food_item} in {location}."

    # Determine the trend
    prices = last_3_months.groupby("Date")["UPRICE"].mean()
    if prices.iloc[-1] > prices.iloc[0]:
        trend = "increasing"
    elif prices.iloc[-1] < prices.iloc[0]:
        trend = "decreasing"
    else:
        trend = "stable"

    response = f"The price trend for {food_item} in {location} over the last 3 months is {trend}.\n"
    response += "Here are the average prices:\n"
    for date, price in prices.items():
        response += f"- {date.strftime('%B %Y')}: ₦{price:.2f}\n"

    return response