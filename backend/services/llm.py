"""
LLM Service: Handles all AI-related tasks including entity extraction, 
intent detection, response generation, and price prediction.
"""
import logging
import joblib
import pandas as pd
import os
from fuzzywuzzy import process
from functools import lru_cache
from sentence_transformers import SentenceTransformer, util

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
    FOOD_ITEMS = df["Food Item"].unique().tolist()
    LGAS = df["LGA"].unique().tolist()

    # Lazy init for embedder (small, fast model)
    _EMBEDDER = None
    INTENT_CANDIDATES = [
        "price_query", "trend_query", "comparison_query",
        "greeting", "help", "thank_you", "about"
    ]

    def get_embedder():
        global _EMBEDDER
        if _EMBEDDER is None:
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

def extract_entities(text: str) -> dict:
    """
    Extracts food items and locations from text using NER and fuzzy matching.
    """
    entities = {"FOOD": None, "GPE": []}
    
    # 1. NER for initial entity extraction
    try:
        # Tokenize text and fuzzy match against known lists
        tokens = [t.strip(",.?! ") for t in text.split() if t.strip()]
        for tok in tokens:
            if not entities["FOOD"]:
                match = process.extractOne(tok, FOOD_ITEMS)
                if match and match[1] >= 85:
                    entities["FOOD"] = match[0]
            match = process.extractOne(tok, LGAS)
            if match and match[1] >= 88 and match[0] not in entities["GPE"]:
                entities["GPE"].append(match[0])
    except Exception as e:
        logger.error(f"Entity extraction failed: {e}", exc_info=True)

    # 2. Fallback to keyword search if NER fails
    if not entities["FOOD"]:
        for food in FOOD_ITEMS:
            if food.lower() in text.lower():
                entities["FOOD"] = food
                break
    if not entities["GPE"]:
        for lga in LGAS:
            if lga.lower() in text.lower():
                entities["GPE"].append(lga)
                
    logger.info(f"Extracted entities: {entities}")
    return entities

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
        if any(k in low for k in ["hello", "hi", "hey"]):
            return "greeting"
        if "help" in low:
            return "help"
        if any(k in low for k in ["thanks", "thank you"]):
            return "thank_you"

        # Fallback to embedding similarity for general cases
        embedder = get_embedder()
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
        # Create a DataFrame for the prediction
        input_df = pd.DataFrame([data])
        
        # One-hot encode categorical features to match the model's training format
        input_encoded = pd.get_dummies(input_df)
        input_aligned = input_encoded.reindex(columns=features, fill_value=0)
        
        # Predict the price
        predicted_price = model.predict(input_aligned)[0]
        
        # Forecast for next month using a simple moving average
        # Get the historical data for the food item and LGA
        historical_data = df[(df["Food Item"] == data["food_item"]) & (df["LGA"] == data["lga"])]
        if len(historical_data) >= 3:
            # Use the average of the last 3 prices as the forecast
            forecast_price = historical_data["UPRICE"].tail(3).mean()
        else:
            # Fallback to a simple percentage increase if there is not enough historical data
            forecast_price = predicted_price * 1.02
        
        return {
            "food_item": data["food_item"],
            "lga": data["lga"],
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