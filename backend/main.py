from fastapi imp# ─── App & CORS Setup ──────────────────────────────────────────────────────────
app = FastAPI(
    title="ChopWise API",
    descr# ─── Root and Health Check Endpoints ─────────────────────────────────────────────
@app.get("/")
async def root():
    """Root endpoint that returns API information"""
    return HTMLResponse(content="""
        <html>
            <head><title>ChopWise API</title></head>
            <body>
                <h1>Welcome to ChopWise API 🥘</h1>
                <p>This is the API backend for the ChopWise Nigerian food price assistant.</p>
                <p>For health status, check <a href="/health">/health</a></p>
                <p>The chat endpoint is at <code>/chat</code></p>
            </body>
        </html>
    """)

@app.get("/health")
async def health():
    """Health check endpoint that verifies all components are working"""
    try:
        if model is None or df_raw is None:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "error",
                    "message": "Application is still initializing"
                }
            )
        
        # Check if Groq API key is configured
        if not GROQ_API_KEY:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "error",
                    "message": "GROQ_API_KEY is not configured"
                }
            )
        
        return {
            "status": "ok",
            "components": {
                "model": "loaded",
                "database": "connected",
                "llm": "configured"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "message": str(e)
            }
        )

# ─── Groq LLM Integration ─────────────────────────────────────────────────────="Nigerian food price assistant API",
    version="1.0.0"
)

# Allow your Netlify site (or "*" during dev) to call these endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://chopwise.netlify.app"],  # Production frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for loaded data
model = None
feature_cols = None
df_raw = None
foods = []
states = []
lgas = []
outlets = []
by_food = {}
by_state = {}

@app.on_event("startup")
async def startup_event():
    """Initialize data and models on startup"""
    global model, feature_cols, df_raw, foods, states, lgas, outlets, by_food, by_state
    
    try:
        # Make sure relative paths resolve
        os.chdir(os.path.dirname(__file__))
        
        # Load model and features
        logging.info("Loading model and features...")
        model = joblib.load("model.pkl")
        feature_cols = joblib.load("features.pkl")
        
        # Load dataset
        logging.info("Loading dataset...")
        df_raw = pd.read_csv(fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import datetime
import regex as re
import os
import random
from difflib import get_close_matches
from starlette.concurrency import run_in_threadpool
from functools import lru_cache
import httpx
import logging
from typing import Optional

# ─── App & CORS Setup ──────────────────────────────────────────────────────────
app = FastAPI()
# Allow your Netlify site (or “*” during dev) to call these endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://chopwise.netlify.app"],  # Production frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Make sure relative paths resolve
os.chdir(os.path.dirname(__file__))

# ─── Load Model & Data ─────────────────────────────────────────────────────────
model       = joblib.load("model.pkl")
feature_cols = joblib.load("features.pkl")
df_raw      = pd.read_csv(
    "FoodPrices_Dataset.csv",
    parse_dates=["Date"],
    dayfirst=True
)

# Precompute lookups for fast access
foods  = df_raw["Food Item"].unique()
states = df_raw["State"].unique()
lgas   = df_raw["LGA"].unique()
outlets= df_raw["Outlet Type"].unique()
by_food = {f: df_raw[df_raw["Food Item"]==f] for f in foods}
by_state = {s: df_raw[df_raw["State"]==s] for s in states}

# In-memory cache for forecasts
forecast_cache = {}

# ─── Request Schema ────────────────────────────────────────────────────────────
class Request(BaseModel):
    message: str

class ChatRequest(BaseModel):
    messages: list  # List of {user: str, bot
def format_reply(templates, **kwargs):
    """Pick one of the templates at random and format it."""
    return random.choice(templates).format(**kwargs)

# --- Entity Extraction Helper ---
def extract_entities(text):
    import re as _re
    clean = _re.sub(r'[\W_]+', ' ', text.lower())
    words = set(clean.split())
    # Foods: match all variants if a generic name is present
    matching_foods = []
    for f in foods:
        f_words = set(f.lower().split())
        # If any word in the query matches any word in the food name, or vice versa
        if any(w in f_words or any(fw in w for fw in f_words) for w in words):
            matching_foods.append(f)
    # If no direct match, try substring match
    if not matching_foods:
        for f in foods:
            if any(w in f.lower() or f.lower() in w for w in words):
                matching_foods.append(f)
    # If still no match, try fuzzy
    if not matching_foods:
        from difflib import get_close_matches
        matches = get_close_matches(' '.join(words), [f.lower() for f in foods], n=3, cutoff=0.4)
        matching_foods = [f for f in foods if f.lower() in matches]
    # States
    found_state = next((s for s in states if s.lower() in text), None)
    # LGAs
    found_lga = next((l for l in lgas if isinstance(l, str) and l.lower() in text), None)
    # Outlets
    found_outlet = next((o for o in outlets if isinstance(o, str) and o.lower() in text), None)
    return {
        'foods': matching_foods,
        'state': found_state,
        'lga': found_lga,
        'outlet': found_outlet
    }

# --- Intent Scoring Helper ---
def score_intents(text):
    text = text.lower()
    words = text.split()
    def score(keywords):
        return sum(1 for w in words for k in keywords if k in w) / max(1, len(words))
    intents = {
        'cheapest': score(["cheapest", "best", "lowest", "where", "find"]),
        'trend': score(["trend", "change", "history", "past", "recent"]),
        'forecast': score(["predict", "forecast", "future", "next", "after"]),
        'price': score(["price", "cost", "how much", "current"])
    }
    return intents

# ─── Health Check Endpoint ─────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

# ─── Groq LLM Integration ─────────────────────────────────────────────────────
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "mixtral-8x7b-32768"  # Switched to Mixtral model for better performance
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

async def query_groq(messages, context):
    """Query the Groq LLM API with proper error handling"""
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY environment variable not set")
        return "Sorry, I'm not properly configured yet. Please make sure the GROQ_API_KEY is set. 🔑"

    prompt = (
        "You are ChopWise, a super-friendly Nigerian food price assistant. "
        "Always use emojis, be helpful, and handle follow-ups, clarifications, and corrections. "
        "Use the food price info below to answer questions.\n\n"
        f"Food Price Data:\n{context}\n\n"
        "Chat History:\n" + "\n".join([f"User: {m['user']}\nBot: {m['bot']}" for m in messages if m['user'] or m['bot']]) + "\n\n"
        "Respond in a personalized, friendly, and helpful way."
    )
    
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": prompt},
            {"role": "user", "content": messages[-1]['user'] if messages else ""}
        ],
        "temperature": 0.7,
        "max_tokens": 1024,  # Increased for more detailed responses
        "top_p": 0.9,
        "stream": False
    }
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:  # Increased timeout
            resp = await client.post(GROQ_API_URL, json=payload, headers=headers)
            
            # Log the full response for debugging
            logger.info(f"Groq API Status: {resp.status_code}")
            logger.info(f"Groq API Headers: {dict(resp.headers)}")
            
            try:
                logger.info(f"Groq API Response: {resp.text}")
            except Exception:
                pass
            
            resp.raise_for_status()
            data = resp.json()
            
            if "choices" not in data or not data["choices"]:
                logger.error(f"Unexpected Groq API response format: {data}")
                return "Sorry, I received an unexpected response format. Please try again! 🤔"
                
            reply = data['choices'][0]['message']['content']
            return reply
            
    except httpx.TimeoutException:
        logger.error("Groq API timeout")
        return "Sorry, the request timed out. Please try again! ⏱️"
        
    except httpx.RequestError as e:
        logger.error(f"Groq API request error: {e}")
        return "Sorry, there was a network error. Please check your connection and try again! 🌐"
        
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                logger.error(f"Groq API error response: {e.response.text}")
            except Exception:
                pass
        return "Sorry, I couldn't process your request right now. Please try again later! 😔"

# --- Async Chat Endpoint ---
from fastapi import Request as FastAPIRequest, Cookie
from fastapi.responses import JSONResponse
import uuid
from typing import Optional

# --- Session Store (in-memory, for demo) ---
sessions = {}

@app.post("/chat")
async def chat(req: ChatRequest, session_id: Optional[str] = Cookie(None)):
    # Assign or retrieve session
    if not session_id:
        session_id = str(uuid.uuid4())
        sessions[session_id] = []
    if session_id not in sessions:
        sessions[session_id] = []
    messages = req.messages
    if not messages or not isinstance(messages, list):
        return JSONResponse(content={"reply": "Please provide a valid chat history.", "session_id": session_id}, headers={"set-cookie": f"session_id={session_id}; Path=/; SameSite=Lax"})
    text = messages[-1]['user'] if messages else ""
    entities = extract_entities(text)
    matching_foods = entities['foods']
    found_state = entities['state']
    found_lga = entities['lga']
    found_outlet = entities['outlet']
    # Early validation
    if not matching_foods:
        from difflib import get_close_matches
        suggestions = get_close_matches(text, [f.lower() for f in foods], n=3, cutoff=0.4)
        if suggestions:
            return JSONResponse(content={"reply": f"I couldn't find that food. Did you mean: {', '.join(suggestions)}? 🍲", "session_id": session_id}, headers={"set-cookie": f"session_id={session_id}; Path=/; SameSite=Lax"})
        else:
            return JSONResponse(content={"reply": "Sorry, I couldn't find that food item. Please try again! 🥲", "session_id": session_id}, headers={"set-cookie": f"session_id={session_id}; Path=/; SameSite=Lax"})
    # Gather context from CSV for matching foods
    context_rows = df_raw[df_raw["Food Item"].isin(matching_foods)]
    if found_state:
        context_rows = context_rows[context_rows["State"] == found_state]
    if found_lga:
        context_rows = context_rows[context_rows["LGA"] == found_lga]
    if found_outlet:
        context_rows = context_rows[context_rows["Outlet Type"] == found_outlet]
    # Limit context to last 10 rows for brevity
    context = context_rows.tail(10).to_string(index=False)
    # Track session messages
    sessions[session_id].extend(messages[-3:])  # Keep last 3 for context
    session_history = sessions[session_id][-3:]
    reply = await query_groq(session_history, context)
    return JSONResponse(content={"reply": reply, "session_id": session_id}, headers={"set-cookie": f"session_id={session_id}; Path=/; SameSite=Lax"})