"""CAMP SDK client wrapper - Mock implementation for frontend-minted NFTs"""
from app.core.camp.models import NFTMetadata, CAMPResponse


class CAMPClient:
    """Client for interacting with CAMP network"""
    
    def __init__(self):
        pass
    
    async def store_watermark_hash(self, metadata: NFTMetadata) -> CAMPResponse:
        """Store watermark hash as NFT metadata on CAMP network"""
        return CAMPResponse(
            success=True,
            nft_id=None,
            message="Watermark hash ready for frontend Origin SDK minting",
            data={"watermark_hash": metadata.watermark_hash}
        )
    
    async def verify_watermark_hash(self, watermark_hash: str) -> CAMPResponse:
        """Verify watermark hash exists on CAMP network"""
        return CAMPResponse(
            success=True,
            message="Watermark hash verified (mock mode - NFTs minted via frontend Origin SDK)",
            data={
                "watermark_hash": watermark_hash,
                "exists": False,
                "mock_mode": True,
            }
        )
