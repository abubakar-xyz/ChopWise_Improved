# --- LLM Service: Entity extraction, intent detection, response generation ---
from transformers import pipeline

# Load models once at module level for efficiency
ner = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

FOODS = ["rice", "beans", "maize", "yam", "cassava", "wheat", "garri", "plantain"]
LOCATIONS = ["lagos", "abuja", "kano", "kaduna", "enugu", "ibadan", "port harcourt"]
INTENTS = ["price_query", "trend_query", "compare_query", "general"]

def extract_entities(text: str):
    entities = {"FOOD": None, "GPE": None}
    ner_results = ner(text)
    for ent in ner_results:
        if ent["entity_group"] == "LOC" and not entities["GPE"]:
            entities["GPE"] = ent["word"].title()
        if ent["entity_group"] == "MISC" or ent["entity_group"] == "ORG":
            for food in FOODS:
                if food in ent["word"].lower():
                    entities["FOOD"] = food
        if ent["entity_group"] == "PER":
            continue
    # fallback: keyword search
    if not entities["FOOD"]:
        for food in FOODS:
            if food in text.lower():
                entities["FOOD"] = food
    if not entities["GPE"]:
        for loc in LOCATIONS:
            if loc in text.lower():
                entities["GPE"] = loc.title()
    return entities

def detect_intent(text: str) -> str:
    candidate_labels = INTENTS
    result = classifier(text, candidate_labels)
    return result["labels"][0] if result["scores"][0] > 0.5 else "general"

def generate_response(intent: str, entities: dict) -> str:
    if intent == "price_query" and (entities.get("FOOD") or entities.get("GPE")):
        food = entities.get("FOOD") or "item"
        location = entities.get("GPE") or "your area"
        return f"The price of {food} in {location} is currently not available, but we're working on it!"
    elif intent == "trend_query":
        return "Food price trends are stable this month."
    elif intent == "compare_query":
        return "Comparison feature is coming soon!"
    else:
        return "I'm ChopWise, your food price assistant. Ask me about food prices, trends, or comparisons!"
