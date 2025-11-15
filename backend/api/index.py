"""
Vercel serverless function entry point for FastAPI backend
"""
from app.main import app

# Export the FastAPI app for Vercel
# Vercel will use this as the handler
handler = app

