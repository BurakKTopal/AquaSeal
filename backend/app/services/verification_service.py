"""Verification logic"""
import json
import io
from typing import BinaryIO

from app.services.watermark_service import WatermarkService
from app.core.camp.nft_service import NFTService
from app.core.hashing.watermark_hash import generate_watermark_hash
from app.models.schemas import WatermarkPayload
from app.utils.exceptions import WatermarkExtractionException, WatermarkingException


class VerificationService:
    """Service for watermark verification"""
    
    def __init__(self):
        """Initialize verification service"""
        self.watermark_service = WatermarkService()
        self.nft_service = NFTService()
    
    async def verify_watermark(
        self,
        file: BinaryIO,
        file_type: str,
        file_extension: str
    ) -> dict:
        """
        Verify watermark in file
        
        Returns:
            Dictionary with verification results
        """
        try:
            # Extract watermark
            watermark_data = None
            extraction_method = None
            extraction_errors = []
            
            # For images, try multiple methods explicitly
            if file_type == "image":
                # Try invisible-watermark first
                if self.watermark_service.image_watermarker and self.watermark_service.image_watermarker.supports_format(file_extension):
                    try:
                        file.seek(0)
                        watermark_data = self.watermark_service.image_watermarker.extract(file)
                        if watermark_data and len(watermark_data) > 0:
                            extraction_method = "invisible-watermark"
                    except Exception as e:
                        extraction_errors.append(f"Invisible-watermark: {str(e)}")
                
                # Try stegano if invisible-watermark failed
                if not watermark_data and self.watermark_service.image_fallback:
                    try:
                        file.seek(0)
                        from PIL import Image
                        img = Image.open(file)
                        if img.format != 'PNG':
                            img = img.convert('RGB')
                            png_buffer = io.BytesIO()
                            img.save(png_buffer, format='PNG')
                            png_buffer.seek(0)
                            watermark_data = self.watermark_service.image_fallback.extract(png_buffer)
                        else:
                            watermark_data = self.watermark_service.image_fallback.extract(file)
                        
                        if watermark_data and len(watermark_data) > 0:
                            extraction_method = "stegano"
                    except Exception as e:
                        extraction_errors.append(f"Stegano: {str(e)}")
                
                if not watermark_data:
                    raise WatermarkExtractionException(
                        f"Failed to extract watermark using any method. Errors: {'; '.join(extraction_errors)}"
                    )
            else:
                # For non-image files, use standard extraction
                watermark_data = None
                extraction_errors = []
                
                # Try without personalization first
                try:
                    file.seek(0)
                    watermark_data = self.watermark_service.extract_watermark(
                        file, file_type, file_extension, personalization_hash=None
                    )
                    extraction_method = "standard"
                except Exception as e1:
                    extraction_errors.append(f"Without personalization: {str(e1)}")
                    
                    # Try with empty hash for audio files
                    if file_type == "audio" and not watermark_data:
                        try:
                            file.seek(0)
                            watermark_data = self.watermark_service.extract_watermark(
                                file, file_type, file_extension, personalization_hash=""
                            )
                            extraction_method = "standard"
                        except Exception as e2:
                            extraction_errors.append(f"With empty hash: {str(e2)}")
                
                if not watermark_data:
                    error_msg = f"Failed to extract watermark. Tried methods: {'; '.join(extraction_errors)}"
                    raise WatermarkExtractionException(error_msg)
            
            # Parse watermark payload
            watermark_str = watermark_data.decode('utf-8', errors='ignore')
            
            try:
                payload_dict = json.loads(watermark_str)
                payload = WatermarkPayload(**payload_dict)
            except (json.JSONDecodeError, ValueError) as e:
                raise WatermarkExtractionException(f"Invalid watermark format: {str(e)}")
            
            # Generate hash from extracted payload
            extracted_hash = generate_watermark_hash(payload)
            
            # Verify hash on CAMP network
            verification_result = await self.nft_service.verify_nft_metadata(extracted_hash)
            
            # Check if hash matches
            match = verification_result.get("success", False) and verification_result.get("data", {}).get("exists", False)
            is_mock_mode = verification_result.get("data", {}).get("mock_mode", False)
            
            # Determine message based on result
            if match:
                message = "Watermark verified successfully - NFT found on CAMP network"
            elif is_mock_mode:
                message = (
                    "Watermark found in file. Note: NFTs are minted in the frontend using Origin SDK. "
                    f"The watermark hash is: {extracted_hash}"
                )
            else:
                message = (
                    f"Watermark found in file, but NFT not found on CAMP network. "
                    f"Watermark hash: {extracted_hash}"
                )
            
            return {
                "verified": True,
                "watermark_found": True,
                "watermark_hash": extracted_hash,
                "match": match,
                "nft_metadata": verification_result.get("data"),
                "payload": payload.model_dump(),
                "message": message
            }
        except (WatermarkExtractionException, WatermarkingException) as e:
            error_msg = str(e)
            is_no_watermark = (
                "no watermark found" in error_msg.lower() or
                "may not be watermarked" in error_msg.lower() or
                "may have been modified" in error_msg.lower()
            )
            
            return {
                "verified": False,
                "watermark_found": False,
                "watermark_hash": None,
                "match": False,
                "nft_metadata": None,
                "message": f"No watermark found in file: {error_msg}" if is_no_watermark else f"Watermark extraction error: {error_msg}"
            }
        except Exception as e:
            return {
                "verified": False,
                "watermark_found": False,
                "watermark_hash": None,
                "match": False,
                "nft_metadata": None,
                "message": f"Verification error: {str(e)}"
            }

