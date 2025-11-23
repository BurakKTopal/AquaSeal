"""Configuration settings for the application"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "AquaSeal - IP Protection Platform"
    VERSION: str = "1.0.0"
    
    MAX_FILE_SIZE: int = 50 * 1024 * 1024
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_IMAGE_EXTENSIONS: list[str] = [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]
    ALLOWED_AUDIO_EXTENSIONS: list[str] = [".mp3"]
    ALLOWED_PDF_EXTENSIONS: list[str] = [".pdf"]
    
    CAMP_API_URL: Optional[str] = None
    CAMP_API_KEY: Optional[str] = None
    
    WATERMARK_STRENGTH: float = 0.5
    REDUNDANT_WATERMARKS: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

