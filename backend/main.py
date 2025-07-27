import os
import uuid
import logging
import httpx
import joblib
import pandas as pd
from typing import Optional, List, Dict, Union
from fastapi import FastAPI, HTTPException, Request, Cookie, status, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
from difflib import get_close_matches
import regex as re
from functools import lru_cache
import asyncio
from datetime import datetime
from collections import defaultdict
import time

# Configure enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load and validate environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in environment variables. API calls will fail!")
    if not os.getenv("TESTING", "").lower() == "true":
        raise ValueError("GROQ_API_KEY environment variable is required")

# Groq API configuration
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "mixtral-8x7b-32768"

# ─── App Setup ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="ChopWise API",
    description="Nigerian food price assistant API",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None
)

# Configure CORS with proper error handling
origins = [
    "https://chopwise.netlify.app",  # Production frontend
    "http://localhost:3000",         # Local development
]

# Add middleware in order of execution
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add Gzip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Global rate limiter settings
RATE_LIMIT = int(os.getenv("RATE_LIMIT", "100"))  # requests per minute
rate_limiter = {}

# Global state management
app.state.model = None
app.state.df_raw = None
app.state.feature_cols = None
app.state.startup_complete = False

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
        # Check initialization status
        if model is None or df_raw is None:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "error",
                    "message": "Application is still initializing"
                }
            )
        
        # Check Groq API key
        if not GROQ_API_KEY:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "error",
                    "message": "GROQ_API_KEY is not configured"
                }
            )
        
        # Test Groq API connectivity
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    GROQ_API_URL.replace("/chat/completions", ""),
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    timeout=5.0
                )
                response.raise_for_status()
        except Exception as e:
            logger.error(f"Groq API connectivity test failed: {str(e)}")
            return JSONResponse(
                status_code=503,
                content={
                    "status": "error",
                    "message": "Unable to connect to Groq API"
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
            status_code=503,
            content={

# --- Rate Limiting ---
RATE_LIMIT = int(os.getenv("RATE_LIMIT", "100"))  # requests per minute
rate_limiter = defaultdict(list)  # {ip: [timestamps]}
        )
def is_rate_limited(ip: str) -> bool:
    now = time.time()
    window = 60  # seconds
    timestamps = rate_limiter[ip]
    # Remove timestamps outside the window
    rate_limiter[ip] = [t for t in timestamps if now - t < window]
    if len(rate_limiter[ip]) >= RATE_LIMIT:
        return True
    rate_limiter[ip].append(now)
    return False

# ─── Data Models ─────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    session_id: Optional[str] = Field(None, pattern=r'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$')
    context: Optional[str] = Field(None, max_length=2000)

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    processed_at: datetime

class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None
    code: str = Field(..., pattern=r'^[A-Z][A-Z0-9_]{2,30}$')

async def query_groq(messages: List[Dict[str, str]], context: Optional[str] = None) -> str:
    """
    Query the Groq LLM API with enhanced error handling and retry logic.
    
    Args:
        messages: List of message dictionaries with role and content
        context: Optional context to append to system message
        
    Returns:
        str: The model's response text
        
    Raises:
        ValueError: If API key is missing or API call fails
        HTTPException: If rate limit exceeded or other API errors
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not configured")
    
    # Add context to system message if provided
    if context:
        messages[0]["content"] = f"{messages[0]['content']}\n\nContext: {context}"
    
    # Configure retry parameters
    max_retries = 3
    base_delay = 1.0  # seconds
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": GROQ_MODEL,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 1000,
                        "top_p": 0.95,
                        "frequency_penalty": 0.0,
                        "presence_penalty": 0.0
                    },
                    timeout=30.0
                )
                
                # Handle different response status codes
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    logger.warning(f"Rate limit exceeded. Retry after {retry_after}s")
                    raise HTTPException(
                        status_code=429,
                        detail=f"Rate limit exceeded. Please try again in {retry_after} seconds."
                    )
                
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
                
        except httpx.TimeoutException:
            logger.warning(f"Timeout on attempt {attempt + 1}/{max_retries}")
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Request to Groq API timed out"
                )
            await asyncio.sleep(base_delay * (2 ** attempt))  # Exponential backoff
            
        except httpx.RequestError as e:
            logger.error(f"Error querying Groq API: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to reach Groq API"
            )
            
        except Exception as e:
            logger.error(f"Unexpected error in Groq query: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error processing Groq API response"
            )
    """Query the Groq LLM API with proper error handling and context"""
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY not set")
        raise ValueError("GROQ_API_KEY is not configured")

    # Prepare system prompt with context
    system_prompt = (
        "You are ChopWise, a friendly Nigerian food price assistant. "
        "You analyze real market data to help users understand food prices. "
        "Always be concise, use emojis, and handle follow-ups naturally.\n\n"
    )
    if context:
        system_prompt += f"Context (Recent price data):\n{context}\n\n"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        *[{"role": m["role"], "content": m["text"]} for m in messages]
                    ],
                    "temperature": 0.7,
                    "max_tokens": 1000,
                    "top_p": 0.95
                }
            )
            
            # Log response status and headers for debugging
            logger.info(f"Groq API Status: {response.status_code}")
            logger.debug(f"Groq API Headers: {dict(response.headers)}")
            
            try:
                response.raise_for_status()
                data = response.json()
                
                if "choices" not in data or not data["choices"]:
                    logger.error(f"Unexpected Groq API response format: {data}")
                    raise ValueError("Unexpected API response format")
                    
                reply = data["choices"][0]["message"]["content"]
                return reply.strip()
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Groq API HTTP error: {e.response.status_code}")
                logger.error(f"Response body: {e.response.text}")
                raise ValueError(f"API error: {e.response.status_code}") from e
                
            except ValueError as e:
                logger.error(f"JSON parsing error: {str(e)}")
                raise ValueError("Invalid API response") from e
                
    except httpx.TimeoutException:
        logger.error("Groq API timeout")
        raise ValueError("Request timed out") from None
        
    except httpx.RequestError as e:
        logger.error(f"Groq API request error: {str(e)}")
        raise ValueError("Network error") from e
        
    except Exception as e:
        logger.error(f"Unexpected error in Groq query: {str(e)}")
        raise ValueError("Unknown error occurred") from e

# Helper functions
def extract_entities(text: str) -> Dict[str, any]:
    """Extract food items, states, LGAs and outlet types from text"""
    # Clean text for matching
    text = text.lower().strip()
    words = set(re.findall(r'\b\w+\b', text))
    
    # Find matching foods (including partial matches)
    matching_foods = []
    for food in foods:
        food_words = set(re.findall(r'\b\w+\b', food.lower()))
        if any(w in food_words or any(fw in w for fw in food_words) for w in words):
            matching_foods.append(food)
    
    # Find state, LGA and outlet
    found_state = next((s for s in states if s.lower() in text), None)
    found_lga = next((l for l in lgas if isinstance(l, str) and l.lower() in text), None)
    found_outlet = next((o for o in outlets if isinstance(o, str) and o.lower() in text), None)
    
    return {
        "foods": matching_foods,
        "state": found_state,
        "lga": found_lga,
        "outlet": found_outlet
    }

def score_intent(text: str) -> Dict[str, float]:
    """Score the intent of the message"""
    text = text.lower()
    words = set(re.findall(r'\b\w+\b', text))
    
    scores = {
        "price": sum(1 for w in words if w in {"price", "cost", "how", "much", "naira", "₦"}),
        "trend": sum(1 for w in words if w in {"trend", "change", "history", "past", "changed"}),
        "forecast": sum(1 for w in words if w in {"predict", "future", "will", "next", "forecast"}),
        "compare": sum(1 for w in words if w in {"compare", "difference", "between", "cheaper", "expensive"}),
        "help": sum(1 for w in words if w in {"help", "how", "what", "example", "tutorial"})
    }
    
    # Normalize scores
    total = sum(scores.values()) or 1
    return {k: v/total for k, v in scores.items()}

# Session storage
sessions: Dict[str, List[Dict]] = {}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@app.post("/chat")
async def chat(request: ChatRequest, session_id: Optional[str] = Cookie(None)):
    """Chat endpoint that handles user messages and maintains context"""
    try:
        # Initialize or retrieve session
        current_session_id = request.session_id or session_id or str(uuid.uuid4())
        if current_session_id not in sessions:
            sessions[current_session_id] = []
        
        # Extract entities from message
        entities = extract_entities(request.message.lower())
        
        # Get relevant context from the database
        context_data = []
        if entities["foods"]:
            df_subset = df_raw[df_raw["Food Item"].isin(entities["foods"])]
            if entities["state"]:
                df_subset = df_subset[df_subset["State"] == entities["state"]]
            if entities["lga"]:
                df_subset = df_subset[df_subset["LGA"] == entities["lga"]]
            if entities["outlet"]:
                df_subset = df_subset[df_subset["Outlet Type"] == entities["outlet"]]
                
            context_data = df_subset.tail(5).to_string(index=False)
        
        # Prepare chat history
        current_messages = sessions[current_session_id][-2:] if sessions[current_session_id] else []
        messages = [
            *current_messages,
            {"role": "user", "text": request.message}
        ]
        
        # Query Groq LLM with context
        try:
            reply = await query_groq(messages, context=context_data)
        except ValueError as e:
            if "GROQ_API_KEY is not configured" in str(e):
                return JSONResponse(
                    status_code=503,
                    content={"error": "The AI service is not properly configured. Please contact support."},
                    headers={"set-cookie": f"session_id={current_session_id}; Path=/; SameSite=Lax"}
                )
            else:
                raise
        
        # Update session history
        sessions[current_session_id].extend([
            {"role": "user", "text": request.message},
            {"role": "bot", "text": reply}
        ])
        
        # Clean old sessions periodically
        if len(sessions) > 1000:  # Prevent memory leaks
            old_sessions = sorted(sessions.items(), key=lambda x: len(x[1]))[:100]
            for old_id, _ in old_sessions:
                del sessions[old_id]
        
        return JSONResponse(
            content={"reply": reply, "session_id": current_session_id},
            headers={"set-cookie": f"session_id={current_session_id}; Path=/; SameSite=Lax"}
        )
        
    except ValueError as e:
        logger.error(f"Chat value error: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={"error": str(e)},
            headers={"set-cookie": f"session_id={current_session_id}; Path=/; SameSite=Lax"}
        )
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": "Sorry, I couldn't reach my LLM brain right now. Please try again later! 😔"},
            headers={"set-cookie": f"session_id={current_session_id}; Path=/; SameSite=Lax"}
        )
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
        logger.info("Loading model and features...")
        model = joblib.load("model.pkl")
        feature_cols = joblib.load("features.pkl")
        
        # Load dataset
        logger.info("Loading dataset...")
        df_raw = pd.read_csv(
            "FoodPrices_Dataset.csv",
            parse_dates=["Date"],
            dayfirst=True
        )
        
        # Precompute lookups for fast access
        foods = df_raw["Food Item"].unique()
        states = df_raw["State"].unique()
        lgas = df_raw["LGA"].unique()
        outlets = df_raw["Outlet Type"].unique()
        by_food = {f: df_raw[df_raw["Food Item"]==f] for f in foods}
        by_state = {s: df_raw[df_raw["State"]==s] for s in states}
        
        logger.info("Startup complete: model and data loaded successfully")
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise e
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