"""Pydantic schemas for request/response models"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MetadataInput(BaseModel):
    """Metadata input from user"""
    user_id: str = Field(..., description="User identifier")
    personal_info: Optional[str] = Field(None, description="Personal information")
    license: str = Field(..., description="License type")
    additional_info: Optional[dict] = Field(None, description="Additional metadata")


class WatermarkPayload(BaseModel):
    """Watermark payload structure"""
    user_id: str
    timestamp: int
    metadata_hash: str
    content_hash: str
    license: str


class UploadResponse(BaseModel):
    """Response after file upload and watermarking"""
    success: bool
    message: str
    watermarked_file_url: Optional[str] = None
    watermark_hash: Optional[str] = None
    nft_id: Optional[str] = None


class VerificationRequest(BaseModel):
    """Request for watermark verification"""
    file_url: Optional[str] = None


class VerificationResponse(BaseModel):
    """Response from watermark verification"""
    verified: bool
    watermark_found: bool
    watermark_hash: Optional[str] = None
    match: bool = False
    nft_metadata: Optional[dict] = None
    message: str

