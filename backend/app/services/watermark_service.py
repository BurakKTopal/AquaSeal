"""High-level watermarking orchestration"""
import io
import time
from typing import BinaryIO, Tuple
from pathlib import Path

from app.core.watermarking.image.invisible_watermark import InvisibleWatermarker
from app.core.watermarking.image.stegano_fallback import SteganoWatermarker
from app.core.watermarking.audio.mp3_metadata_watermark import MP3MetadataWatermarker
from app.core.watermarking.metadata.metadata_watermark import MetadataWatermarker
from app.core.watermarking.pdf.pdf_watermark import PDFWatermarker
from app.core.hashing.watermark_hash import create_watermark_payload, generate_watermark_hash
from app.core.hashing.content_hash import compute_file_hash, compute_string_hash
from app.utils.exceptions import WatermarkingException


class WatermarkService:
    """Service for watermarking operations"""
    
    def __init__(self):
        """Initialize watermark service"""
        self._image_watermarker = None
        self._image_fallback = None
        self._metadata_watermarker = None
        self._pdf_watermarker = None
    
    @property
    def image_watermarker(self):
        """Lazy initialization of invisible watermarker"""
        if self._image_watermarker is None:
            try:
                self._image_watermarker = InvisibleWatermarker()
            except WatermarkingException:
                # If invisible-watermark is not available, use None
                # We'll fall back to stegano
                self._image_watermarker = False
        if self._image_watermarker is False:
            return None
        return self._image_watermarker
    
    @property
    def image_fallback(self):
        """Lazy initialization of stegano fallback"""
        if self._image_fallback is None:
            try:
                self._image_fallback = SteganoWatermarker()
            except WatermarkingException:
                self._image_fallback = False
        if self._image_fallback is False:
            return None
        return self._image_fallback
    
    
    @property
    def metadata_watermarker(self):
        """Lazy initialization of metadata watermarker"""
        if self._metadata_watermarker is None:
            try:
                self._metadata_watermarker = MetadataWatermarker()
            except WatermarkingException:
                self._metadata_watermarker = False
        if self._metadata_watermarker is False:
            return None
        return self._metadata_watermarker
    
    @property
    def pdf_watermarker(self):
        """Lazy initialization of PDF watermarker"""
        if self._pdf_watermarker is None:
            try:
                self._pdf_watermarker = PDFWatermarker()
            except WatermarkingException:
                self._pdf_watermarker = False
        if self._pdf_watermarker is False:
            return None
        return self._pdf_watermarker
    
    def _get_watermarker(self, file_type: str, file_extension: str):
        """Get appropriate watermarker for file type"""
        if file_type == "image":
            # Try invisible-watermark first, fallback to stegano
            watermarker = self.image_watermarker
            if watermarker and watermarker.supports_format(file_extension):
                return watermarker
            
            fallback = self.image_fallback
            if fallback and fallback.supports_format(file_extension):
                return fallback
            
            # If no watermarker is available, raise error
            if watermarker is None and fallback is None:
                raise WatermarkingException(
                    "No image watermarking library available. "
                    "Please install invisible-watermark or stegano: "
                    "pip install invisible-watermark OR pip install stegano"
                )
            raise WatermarkingException(f"Unsupported image format: {file_extension}")
        elif file_type == "audio":
            # Only MP3 audio files are supported (uses MP3MetadataWatermarker)
            if file_extension.lower() != '.mp3':
                raise WatermarkingException(
                    f"Only MP3 audio files are supported. Received: {file_extension}. "
                    "Please convert your audio file to MP3 format."
                )
            watermarker = MP3MetadataWatermarker()
            if watermarker and watermarker.supports_format(file_extension):
                return watermarker
            raise WatermarkingException(
                "MP3 metadata watermarking not available. "
                "Please install mutagen: pip install mutagen"
            )
        elif file_type == "pdf":
            watermarker = self.pdf_watermarker
            if watermarker and watermarker.supports_format(file_extension):
                return watermarker
            if watermarker is None:
                raise WatermarkingException(
                    "PDF watermarking library not available. "
                    "Please install pypdf: "
                    "pip install pypdf"
                )
            raise WatermarkingException(f"Unsupported PDF format: {file_extension}")
        else:
            raise WatermarkingException(f"Unsupported file type: {file_type}")
    
    def embed_watermark(
        self,
        file: BinaryIO,
        file_type: str,
        file_extension: str,
        user_id: str,
        metadata: dict,
        license: str
    ) -> Tuple[bytes, str]:
        """
        Embed watermark into file using multiple methods for redundancy
        
        Returns:
            Tuple of (watermarked_file_bytes, watermark_hash)
        """
        from app.config import settings
        
        # Compute content hash
        content_hash = compute_file_hash(file)
        
        # Compute metadata hash
        metadata_str = str(sorted(metadata.items()))
        metadata_hash = compute_string_hash(metadata_str)
        
        # Create watermark payload
        timestamp = int(time.time())
        payload = create_watermark_payload(
            user_id=user_id,
            timestamp=timestamp,
            metadata_hash=metadata_hash,
            content_hash=content_hash,
            license=license
        )
        
        # Generate watermark hash
        watermark_hash = generate_watermark_hash(payload)
        
        # Convert payload to bytes for embedding
        import json
        watermark_data = json.dumps(payload.model_dump()).encode('utf-8')
        
        # For images, try to embed using multiple methods if available
        if file_type == "image":
            watermarked_bytes = self._embed_image_multiple(file, file_extension, watermark_data, settings.REDUNDANT_WATERMARKS)
        elif file_type == "audio":
            # Only MP3 files are supported - use metadata watermarking (survives compression)
            if file_extension.lower() != '.mp3':
                raise WatermarkingException(
                    f"Only MP3 audio files are supported. Received: {file_extension}. "
                    "Please convert your audio file to MP3 format."
                )
            mp3_watermarker = MP3MetadataWatermarker()
            if not mp3_watermarker.supports_format(file_extension):
                raise WatermarkingException(
                    "MP3 metadata watermarking not available. "
                    "Please install mutagen: pip install mutagen"
                )
            file.seek(0)
            watermarked_bytes = mp3_watermarker.embed(file, watermark_data)
        elif file_type == "pdf":
            # For PDFs, use PDF watermarker
            watermarker = self._get_watermarker(file_type, file_extension)
            file.seek(0)
            watermarked_bytes = watermarker.embed(file, watermark_data)
        else:
            # For other file types, use single watermarker
            watermarker = self._get_watermarker(file_type, file_extension)
            file.seek(0)
            watermarked_bytes = watermarker.embed(file, watermark_data)
        
        return watermarked_bytes, watermark_hash
    
    def _embed_image_multiple(self, file: BinaryIO, file_extension: str, watermark_data: bytes, num_watermarks: int) -> bytes:
        """Embed watermark into image using multiple methods for redundancy"""
        file.seek(0)
        current_file = file
        
        # Layer 1: Try invisible-watermark first (most robust steganographic method)
        if self.image_watermarker and self.image_watermarker.supports_format(file_extension):
            try:
                current_file.seek(0)
                watermarked_bytes = self.image_watermarker.embed(current_file, watermark_data)
                current_file = io.BytesIO(watermarked_bytes)
            except Exception:
                current_file = file
        
        # Layer 2: Add stegano watermark if available and we want multiple watermarks
        if num_watermarks > 1 and self.image_fallback and self.image_fallback.supports_format('.png'):
            try:
                from PIL import Image
                current_file.seek(0)
                img = Image.open(current_file)
                if img.format != 'PNG':
                    img = img.convert('RGB')
                
                png_buffer = io.BytesIO()
                img.save(png_buffer, format='PNG')
                png_buffer.seek(0)
                
                # Embed second watermark using stegano
                watermarked_bytes = self.image_fallback.embed(png_buffer, watermark_data)
                current_file = io.BytesIO(watermarked_bytes)
            except Exception:
                pass  # Non-critical failure
        
        # Layer 3: Add metadata watermark (always try - survives most operations)
        if self.metadata_watermarker and self.metadata_watermarker.supports_format(file_extension):
            try:
                current_file.seek(0)
                watermarked_bytes = self.metadata_watermarker.embed(current_file, watermark_data)
                current_file = io.BytesIO(watermarked_bytes)
                pass  # Metadata watermark added successfully
            except Exception:
                pass  # Non-critical failure
        
        # If we still have the original file, try stegano as fallback
        if current_file == file and self.image_fallback and self.image_fallback.supports_format(file_extension):
            current_file.seek(0)
            return self.image_fallback.embed(current_file, watermark_data)
        
        if current_file != file:
            current_file.seek(0)
            return current_file.read()
        
        raise WatermarkingException("No image watermarking method available")
    
    def extract_watermark(
        self,
        file: BinaryIO,
        file_type: str,
        file_extension: str,
        personalization_hash: str = None
    ) -> bytes:
        """
        Extract watermark from file, trying multiple methods
        
        Args:
            file: File to extract watermark from
            file_type: Type of file (image, audio, pdf)
            file_extension: File extension
            personalization_hash: Optional hash for personalized audio watermark extraction
        
        Returns the first successfully extracted watermark
        """
        if file_type == "image":
            return self._extract_image_multiple(file, file_extension)
        elif file_type == "audio":
            # Only MP3 files are supported - use metadata extraction
            if file_extension.lower() != '.mp3':
                raise WatermarkingException(
                    f"Only MP3 audio files are supported. Received: {file_extension}. "
                    "Please convert your audio file to MP3 format."
                )
            mp3_watermarker = MP3MetadataWatermarker()
            if mp3_watermarker.supports_format(file_extension):
                file.seek(0)
                return mp3_watermarker.extract(file)
            else:
                raise WatermarkingException(
                    "MP3 metadata extraction not available. "
                    "Please install mutagen: pip install mutagen"
                )
        else:
            # For other file types (pdf), use single watermarker
            watermarker = self._get_watermarker(file_type, file_extension)
            file.seek(0)
            return watermarker.extract(file)
    
    def _extract_image_multiple(self, file: BinaryIO, file_extension: str) -> bytes:
        """Extract watermark from image trying multiple methods"""
        errors = []
        
        # Try metadata watermark first (most persistent - survives most operations)
        if self.metadata_watermarker and self.metadata_watermarker.supports_format(file_extension):
            try:
                file.seek(0)
                watermark_data = self.metadata_watermarker.extract(file)
                if watermark_data and len(watermark_data) > 0:
                    return watermark_data
            except Exception as e:
                errors.append(f"Metadata: {str(e)}")
        
        # Try invisible-watermark second (robust steganographic method)
        if self.image_watermarker and self.image_watermarker.supports_format(file_extension):
            try:
                file.seek(0)
                watermark_data = self.image_watermarker.extract(file)
                if watermark_data and len(watermark_data) > 0:
                    return watermark_data
            except Exception as e:
                errors.append(f"Invisible-watermark: {str(e)}")
        
        # Try stegano as fallback
        if self.image_fallback and self.image_fallback.supports_format('.png'):
            try:
                file.seek(0)
                # Convert to PNG if needed for stegano
                from PIL import Image
                img = Image.open(file)
                if img.format != 'PNG':
                    img = img.convert('RGB')
                    png_buffer = io.BytesIO()
                    img.save(png_buffer, format='PNG')
                    png_buffer.seek(0)
                    watermark_data = self.image_fallback.extract(png_buffer)
                else:
                    watermark_data = self.image_fallback.extract(file)
                
                if watermark_data and len(watermark_data) > 0:
                    return watermark_data
            except Exception as e:
                errors.append(f"Stegano: {str(e)}")
        
        # If all methods failed, raise exception with all errors
        error_msg = "Failed to extract watermark from image. Tried methods: " + "; ".join(errors)
        raise WatermarkingException(error_msg)

