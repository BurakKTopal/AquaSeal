"""CAMP data models"""
from pydantic import BaseModel
from typing import Optional, Dict, Any


class NFTMetadata(BaseModel):
    """NFT metadata structure for CAMP network"""
    watermark_hash: str
    user_id: str
    timestamp: int
    content_type: str  # "image" or "audio"
    license: str
    additional_metadata: Optional[Dict[str, Any]] = None


class CAMPResponse(BaseModel):
    """Response from CAMP API"""
    success: bool
    nft_id: Optional[str] = None
    message: str
    data: Optional[Dict[str, Any]] = None

