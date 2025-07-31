import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.responses import JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Routers
from api.chat import router as chat_router
from api.info import router as info_router

def create_app() -> FastAPI:
    app = FastAPI(title="ChopWise Food Price Assistant API", version="1.0.0")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # GZip
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Routers
    app.include_router(chat_router, prefix="/chat", tags=["chat"])
    app.include_router(info_router, prefix="/info", tags=["info"])

    @app.get("/", tags=["root"])
    async def root():
        return {"message": "Welcome to ChopWise Food Price Assistant API!"}

    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok"}

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled error: {exc}", exc_info=True)
        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )

    return app

app = create_app()
