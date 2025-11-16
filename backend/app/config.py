"""Configuration settings for the application"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # Server Settings
    HOST: str = "0.0.0.0"  # Bind to all interfaces for network access
    PORT: int = 8000
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "AquaSeal - IP Protection Platform"
    VERSION: str = "1.0.0"
    
    # File Upload Settings
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_IMAGE_EXTENSIONS: list[str] = [".jpg", ".jpeg", ".png", ".bmp", ".tiff"]
    ALLOWED_AUDIO_EXTENSIONS: list[str] = [".mp3"]  # Only MP3 supported - uses mutagen for metadata watermarking
    ALLOWED_PDF_EXTENSIONS: list[str] = [".pdf"]
    
    # CAMP Network Settings
    # Note: NFTs are minted in frontend using Origin SDK, so backend API URL is not needed
    # These settings are kept for backward compatibility but are not used
    CAMP_API_URL: Optional[str] = None  # Deprecated - not used (NFTs minted in frontend)
    CAMP_API_KEY: Optional[str] = None  # Deprecated - not used (NFTs minted in frontend)
    
    # Watermark Settings
    WATERMARK_STRENGTH: float = 0.5  # 0.0 to 1.0
    REDUNDANT_WATERMARKS: int = 3  # Number of redundant watermarks
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

