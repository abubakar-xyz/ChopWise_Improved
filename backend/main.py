"""
ChopWise Food Price Assistant API - Main Application Entry Point
 Modular FastAPI app with CORS, GZip, logging, and robust error handling
 Imports routers for chat and info endpoints
 Loads environment variables for configuration
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Logging configuration (INFO level for production)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import routers (modular endpoints)
from api.chat import router as chat_router
from api.info import router as info_router

def create_app() -> FastAPI:
    """
    Create and configure FastAPI app instance with all middleware, routers, and error handling.
    """
    app = FastAPI(title="ChopWise Food Price Assistant API", version="1.0.0")

    # Enable CORS for all origins (adjust for production if needed)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Enable GZip compression for large responses
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Register API routers
    app.include_router(chat_router, prefix="/chat", tags=["chat"])
    app.include_router(info_router, prefix="/info", tags=["info"])

    # Root endpoint
    @app.get("/", tags=["root"])
    async def root():
        return {"message": "Welcome to ChopWise Food Price Assistant API!"}

    # Health check endpoint
    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok"}

    # Global exception handler for robust error reporting
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error: {exc}", exc_info=True)
        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )

    return app

# Create app instance for ASGI server
app = create_app()
