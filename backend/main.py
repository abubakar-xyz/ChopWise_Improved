"""
ChopWise Food Price Assistant API - Main Application Entry Point

This module sets up the FastAPI application, including middleware, routers, 
and exception handling. It serves as the central point for configuring and 
launching the API.
"""

import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
from dotenv import load_dotenv

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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://chopwise-improved.netlify.app"],  # Restrict this in production for security
        allow_credentials=True,
        allow_methods=["GET", "POST"], # Specify allowed methods
        allow_headers=["Content-Type", "Authorization"], # Specify allowed headers
    )

    # Add GZip middleware to compress large responses
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Include the chat and info routers with their respective prefixes
    app.include_router(chat_router, prefix="/api", tags=["Chat"])
    app.include_router(info_router, prefix="/api", tags=["Info"])

    # Define a root endpoint for basic API information
    @app.get("/", tags=["Root"])
    async def root():
        return {"message": "Welcome to the ChopWise API!"}

    # Define a health check endpoint for monitoring
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "ok"}

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