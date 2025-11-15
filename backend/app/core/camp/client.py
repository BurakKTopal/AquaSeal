"""CAMP SDK client wrapper - Mock implementation for frontend-minted NFTs"""
from app.core.camp.models import NFTMetadata, CAMPResponse


class CAMPClient:
    """
    Client for interacting with CAMP network
    
    Note: NFTs are minted in the frontend using Origin SDK.
    This backend client provides mock responses for verification.
    Real NFT verification should be done via frontend subgraph queries.
    """
    
    def __init__(self):
        """Initialize CAMP client (mock mode only)"""
        pass
    
    async def store_watermark_hash(self, metadata: NFTMetadata) -> CAMPResponse:
        """
        Store watermark hash as NFT metadata on CAMP network
        
        Note: This is a mock implementation. Real NFT minting is handled
        by the frontend using Origin SDK.
        
        Returns:
            Mock response indicating frontend should handle minting
        """
        return CAMPResponse(
            success=True,
            nft_id=None,  # Frontend will handle minting
            message="Watermark hash ready for frontend Origin SDK minting",
            data={"watermark_hash": metadata.watermark_hash}
        )
    
    async def verify_watermark_hash(self, watermark_hash: str) -> CAMPResponse:
        """
        Verify watermark hash exists on CAMP network
        
        Note: This is a mock implementation. Real NFTs are minted in the frontend
        using Origin SDK, so backend verification cannot find them.
        
        For real verification, use the frontend subgraph query or Origin SDK.
        
        Args:
            watermark_hash: The watermark hash to verify
            
        Returns:
            Mock response indicating NFT verification status
        """
        return CAMPResponse(
            success=True,
            message="Watermark hash verified (mock mode - NFTs minted via frontend Origin SDK)",
            data={
                "watermark_hash": watermark_hash,
                "exists": False,
                "mock_mode": True,
                "note": (
                    "NFTs are minted in frontend using Origin SDK. "
                    "Backend verification checks backend API, not frontend-minted NFTs. "
                    "For real verification, use frontend subgraph query or Origin SDK."
                )
            }
        )
