"""FastAPI application entry point"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import upload, watermark, verify

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AquaSeal - IP Protection Platform API"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix=settings.API_V1_PREFIX, tags=["upload"])
app.include_router(watermark.router, prefix=settings.API_V1_PREFIX, tags=["watermark"])
app.include_router(verify.router, prefix=settings.API_V1_PREFIX, tags=["verify"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AquaSeal - IP Protection Platform API",
        "version": settings.VERSION
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

