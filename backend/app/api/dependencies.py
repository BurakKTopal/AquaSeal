"""Shared API dependencies"""
from app.services.watermark_service import WatermarkService
from app.services.verification_service import VerificationService
from app.core.camp.nft_service import NFTService

# Global instances (singleton pattern)
_watermark_service = None
_verification_service = None
_nft_service = None


def get_watermark_service() -> WatermarkService:
    """Dependency for watermark service"""
    global _watermark_service
    if _watermark_service is None:
        _watermark_service = WatermarkService()
    return _watermark_service


def get_verification_service() -> VerificationService:
    """Dependency for verification service"""
    global _verification_service
    if _verification_service is None:
        _verification_service = VerificationService()
    return _verification_service


def get_nft_service() -> NFTService:
    """Dependency for NFT service"""
    global _nft_service
    if _nft_service is None:
        _nft_service = NFTService()
    return _nft_service

