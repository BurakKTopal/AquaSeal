#!/usr/bin/env python3
"""Run the FastAPI server with uvicorn"""
import uvicorn
from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,  # Enable auto-reload in development
        log_level="info"
    )

