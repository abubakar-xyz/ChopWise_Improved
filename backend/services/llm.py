"""
LLM Service: Handles all AI-related tasks including entity extraction, 
intent detection, response generation, and price prediction.
"""
import logging
import joblib
import pandas as pd
from fuzzywuzzy import process
from transformers import pipeline

# --- Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Load Models and Data ---
try:
    # Load the pre-trained model and features
    model = joblib.load("model.pkl")
    features = joblib.load("features.pkl")
    
    # Load the dataset for entity matching
    df = pd.read_csv("FoodPrices_Dataset.csv")
    FOOD_ITEMS = df["Food Item"].unique().tolist()
    LGAS = df["LGA"].unique().tolist()
    
    # Load transformer pipelines
    ner_pipeline = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
    intent_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
    INTENT_CANDIDATES = ["price_query", "trend_query", "comparison_query", "greeting", "help"]

except Exception as e:
    logger.error(f"Error loading models or data: {e}", exc_info=True)
    # Exit if models can't be loaded, as the service is not functional
    raise RuntimeError("Could not load critical model or data files.") from e

# --- Core Functions ---

def extract_entities(text: str) -> dict:
    """
    Extracts food items and locations from text using NER and fuzzy matching.
    """
    entities = {"FOOD": None, "GPE": None}
    
    # 1. NER for initial entity extraction
    try:
        ner_results = ner_pipeline(text)
        for entity in ner_results:
            if entity["entity_group"] == "MISC" and not entities["FOOD"]:
                # Use fuzzy matching to find the closest food item
                match, score = process.extractOne(entity["word"], FOOD_ITEMS)
                if score > 80: # Confidence threshold
                    entities["FOOD"] = match
            elif entity["entity_group"] == "LOC" and not entities["GPE"]:
                # Use fuzzy matching for locations
                match, score = process.extractOne(entity["word"], LGAS)
                if score > 80:
                    entities["GPE"] = match
    except Exception as e:
        logger.error(f"NER processing failed: {e}", exc_info=True)

    # 2. Fallback to keyword search if NER fails
    if not entities["FOOD"]:
        for food in FOOD_ITEMS:
            if food.lower() in text.lower():
                entities["FOOD"] = food
                break
    if not entities["GPE"]:
        for lga in LGAS:
            if lga.lower() in text.lower():
                entities["GPE"] = lga
                break
                
    logger.info(f"Extracted entities: {entities}")
    return entities

def detect_intent(text: str) -> str:
    """
    Detects the user's intent from the text.
    """
    try:
        result = intent_classifier(text, INTENT_CANDIDATES)
        # Return the highest-scoring intent if it meets a confidence threshold
        if result["scores"][0] > 0.6:
            return result["labels"][0]
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
        
        # Simple forecast for next month (e.g., 2% increase)
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
            return f"The estimated price of {retrieved_data['food_item']} in {retrieved_data['lga']} is â‚¦{retrieved_data['predicted_price']:.2f}. The forecast for next month is â‚¦{retrieved_data['forecast_price']:.2f}."
        else:
            return "I couldn't fetch the price. Please ensure the food item and location are correct."

    if intent == "greeting":
        return "Hello! I'm ChopWise, your guide to food prices in Nigeria. How can I help you today?"

    if intent == "help":
        return "You can ask me for the price of a food item in a specific location (LGA), for example: 'What is the price of rice in Ikeja?'"

    if intent == "trend_query":
        return "I can provide price trends, but this feature is currently in development. Please check back soon!"

    if intent == "comparison_query":
        return "I can compare prices, but this feature is also in development. Please check back soon!"

    # Default response for general or unrecognized intents
    return "I'm sorry, I didn't quite understand. Please ask me about food prices in a specific location, or type 'help' for more options."