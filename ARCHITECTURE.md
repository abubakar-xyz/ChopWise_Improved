ChopWise Architecture Overview
================================

High-Level Flow
---------------

User (Next.js UI) -> /api/chat (FastAPI) -> RAG Orchestrator (rag_service) -> LLM Service (llm.py) -> Model/Data Artifacts -> Response

Components
----------

1. Frontend (Next.js)
   - Chat interface with: loading states, debounced autocomplete suggestions (foods + LGAs), example prompts, prompt length counter.
   - Uses `config.js` to derive backend base URL; calls `/api/chat` and `/api/info`.

2. API Layer (FastAPI - main.py)
   - Routers: `/api/chat`, `/api/info`, `/health`, `/health/deep`.
   - Middleware:
     * CORS (regex allowlist)
     * GZip (responses > 1000 bytes)
     * Rate limiting (IP-based sliding window, env configurable: RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)
     * Structured request logging (request_id, latency)

3. Chat Endpoint (api/chat.py)
   - Validates message history (max 10), passes session + messages to chatbot service.
   - Generates new session id if absent (final UUID validation performed in RAG layer).

4. RAG Service (rag_service.py)
   - Normalizes messages, trims history.
   - Validates or regenerates session_id (UUID).
   - Extracts entities (fuzzy matching) + detects intent (heuristics + optional embeddings).
   - Price prediction retrieval with in-memory TTL cache (5 min) per (food_item,lga).
   - Specialized branches for comparison and trend queries.
   - Stores compact per-turn record (user, bot, intent, entities) capped at MAX_HISTORY.

5. LLM Service (llm.py)
   - Loads tabular ML artifacts (model.pkl, features.pkl) + dataset.
   - Entity extraction via fuzzy matching + substring fallback.
   - Intent detection: heuristics, optional sentence-transformers fallback (only if available; not required in production minimal build).
   - Price prediction: one-hot alignment, simple moving average forecasting fallback.

6. Data Artifacts
   - FoodPrices_Dataset.csv: canonical source for entity vocab + historical prices.
   - model.pkl / features.pkl: RandomForestRegressor + feature vector schema.

7. Observability & Ops
   - /health: liveness.
   - /health/deep: exercises intent + entity paths, returns rate-limit metrics snapshot.
   - Structured JSON-like logs for start/end/error with ms latency and request id header (X-Request-ID).

Security / Safety Measures
--------------------------
   - Rate limiting to mitigate abuse (defaults 60 req / 60s per IP).
   - Input length enforcement (frontend) and message history capping.
   - Session ID normalization (forces UUID form).
   - Minimal dependency surface (no heavyweight transformer stack by default).

Performance Tactics
-------------------
   - LRU cache for intent detection.
   - Prediction TTL cache for frequent (food,lga) queries.
   - Dataset cached via lru_cache in info endpoint.
   - History and fuzzy matching optimized by early heuristics.

Environment Variables
---------------------
   - ALLOWED_ORIGIN_REGEX: CORS regex.
   - RATE_LIMIT_MAX / RATE_LIMIT_WINDOW: Rate limiting config.
   - SENTENCE_TRANSFORMERS_MODEL: Optional embedder identifier.

Deployment Notes
----------------
   - Ensure Python version pinned (runtime.txt or Docker) to 3.12.*.
   - `requirements.txt` excludes heavy ML libs; only add optional file if embeddings required.
   - Health endpoints used by Render for readiness checks.

Future Enhancements (Optional)
------------------------------
   - Persist chat histories (Redis / Postgres) for analytics.
   - Replace fuzzy matching with compiled trigram index for scalability.
   - Add structured log sink (OpenTelemetry / Log aggregation).
   - Extend trend analysis with statistical models (ARIMA, Prophet) if needed.
