"""NFT metadata operations"""
from app.core.camp.client import CAMPClient
from app.core.camp.models import NFTMetadata
from app.utils.exceptions import CAMPIntegrationException


class NFTService:
    """Service for NFT metadata operations"""
    
    def __init__(self):
        """Initialize NFT service"""
        self.client = CAMPClient()
    
    async def create_nft_metadata(
        self,
        watermark_hash: str,
        user_id: str,
        timestamp: int,
        content_type: str,
        license: str,
        additional_metadata: dict = None
    ) -> str:
        """
        Create NFT metadata on CAMP network
        
        Returns:
            NFT ID
        """
        metadata = NFTMetadata(
            watermark_hash=watermark_hash,
            user_id=user_id,
            timestamp=timestamp,
            content_type=content_type,
            license=license,
            additional_metadata=additional_metadata
        )
        
        response = await self.client.store_watermark_hash(metadata)
        
        if not response.success:
            raise CAMPIntegrationException(response.message)
        
        return response.nft_id
    
    async def verify_nft_metadata(self, watermark_hash: str) -> dict:
        """
        Verify NFT metadata exists on CAMP network
        
        Returns:
            Dictionary with verification result
        """
        response = await self.client.verify_watermark_hash(watermark_hash)
        return response.model_dump()

