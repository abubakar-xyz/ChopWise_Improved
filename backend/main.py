"""
ChopWise Food Price Assistant API - Main Application Entry Point

This module sets up the FastAPI application, including middleware, routers, 
and exception handling. It serves as the central point for configuring and 
launching the API.
"""

import logging
import version_check  # noqa: F401 ensures Python version enforcement
import os
import time
import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
from dotenv import load_dotenv
from collections import defaultdict, deque
from typing import Deque, Dict
from services.llm import extract_entities, detect_intent

# Load environment variables from a .env file
load_dotenv()

# Configure logging to provide informative output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import API routers for different functionalities
from api.chat import router as chat_router
from api.info import router as info_router

def create_app() -> FastAPI:
    """
    Creates and configures the FastAPI application instance.

    This function initializes the FastAPI app and sets up essential 
    middleware for CORS and GZip compression. It also includes the API 
    routers and defines global exception handlers for robust error management.
    """
    # Initialize the FastAPI application
    app = FastAPI(
        title="ChopWise Food Price Assistant API",
        description="An intelligent API for food price information and predictions in Nigeria.",
        version="1.2.0"
    )

    # Configure CORS to allow requests from all origins
    # Prefer regex for wildcards (Netlify previews, Render domains), fallback to explicit list
    origin_regex = os.getenv(
        "ALLOWED_ORIGIN_REGEX",
        # Default broadly for simplicity in multi-env; tighten via env in prod
        r"^https?://.*$",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=origin_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    # Add GZip middleware to compress large responses
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Include the chat and info routers with their respective prefixes
    app.include_router(chat_router, prefix="/api", tags=["Chat"])
    app.include_router(info_router, prefix="/api", tags=["Info"])

    @app.get("/api/ping", tags=["Health"])
    async def ping():
        return {"pong": True}

    # --- Lightweight in-memory rate limiting (IP-based) ---
    RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "60"))  # requests
    RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds
    _ip_hits: Dict[str, Deque[float]] = defaultdict(lambda: deque())

    @app.middleware("http")
    async def rate_limit_and_logging_mw(request: Request, call_next):
        start = time.time()
        client_ip = request.client.host if request.client else "unknown"
        now = start

        # Rate limiting (skip for health endpoints)
        if not request.url.path.startswith("/health"):
            hits = _ip_hits[client_ip]
            # prune old
            while hits and now - hits[0] > RATE_LIMIT_WINDOW:
                hits.popleft()
            if len(hits) >= RATE_LIMIT_MAX:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Please slow down."},
                )
            hits.append(now)

        # Request ID
        req_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        # Structured log start
        logging.info(
            "REQ start", extra={
                "event": "request_start", "method": request.method, "path": request.url.path,
                "ip": client_ip, "request_id": req_id
            }
        )
        try:
            response: Response = await call_next(request)
        except Exception as exc:  # already handled by exception handler, but log latency
            duration = (time.time() - start) * 1000
            logging.error("REQ error", extra={
                "event": "request_error", "method": request.method, "path": request.url.path,
                "ip": client_ip, "request_id": req_id, "ms": round(duration, 2), "error": str(exc)
            })
            raise
        duration = (time.time() - start) * 1000
        response.headers["X-Request-ID"] = req_id
        logging.info(
            "REQ done", extra={
                "event": "request_end", "method": request.method, "path": request.url.path,
                "ip": client_ip, "request_id": req_id, "status": response.status_code, "ms": round(duration, 2)
            }
        )
        return response

    # Define a root endpoint for basic API information
    @app.get("/", tags=["Root"])
    async def root():
        return {"message": "Welcome to the ChopWise API!"}

    # Define a health check endpoint for monitoring
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "ok"}

    # Simple metrics store (can be expanded) using closure variables above
    @app.get("/health/deep", tags=["Health"])
    async def deep_health_check():
        try:
            # Exercise core components
            _ = detect_intent("hello")
            _ = extract_entities("price of rice in Ikeja")
            # Provide rate limit snapshot
            sample_metrics = {
                "tracked_ips": len(_ip_hits),
                "rate_limit_max": RATE_LIMIT_MAX,
                "rate_limit_window_sec": RATE_LIMIT_WINDOW,
            }
            return {"status": "ok", "llm": "ready", "metrics": sample_metrics}
        except Exception as exc:
            logger.error(f"Deep health check failed: {exc}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"status": "fail", "detail": str(exc)},
            )

    # Global exception handler to catch unhandled errors
    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An unexpected internal server error occurred."},
        )

    return app

# Create the FastAPI app instance for the ASGI server
app = create_app()