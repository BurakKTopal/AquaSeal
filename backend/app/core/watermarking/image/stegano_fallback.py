"""Fallback image watermarking using stegano"""
import io
from typing import BinaryIO

try:
    from stegano import lsb
except ImportError:
    lsb = None

from app.core.watermarking.base import BaseWatermarker
from app.utils.exceptions import WatermarkingException


class SteganoWatermarker(BaseWatermarker):
    """Fallback image watermarker using stegano library"""
    
    def __init__(self):
        """Initialize watermarker"""
        if lsb is None:
            raise WatermarkingException(
                "stegano library not installed. Install with: pip install stegano"
            )
    
    def embed(self, file: BinaryIO, watermark_data: bytes) -> bytes:
        """Embed watermark into image using LSB steganography"""
        try:
            file.seek(0)
            # Convert watermark to string
            watermark_str = watermark_data.decode('utf-8', errors='ignore')
            
            # Use stegano LSB
            secret = lsb.hide(file, watermark_str)
            
            # Save to bytes
            output = io.BytesIO()
            secret.save(output, format='PNG')
            output.seek(0)
            
            return output.read()
        except Exception as e:
            raise WatermarkingException(f"Failed to embed watermark with stegano: {str(e)}")
    
    def extract(self, file: BinaryIO) -> bytes:
        """Extract watermark from image"""
        try:
            file.seek(0)
            watermark_str = lsb.reveal(file)
            if watermark_str:
                return watermark_str.encode('utf-8')
            else:
                raise WatermarkingException("No watermark found in image")
        except (IndexError, ValueError) as e:
            # IndexError/ValueError typically means no watermark is present
            # or the image was modified in a way that corrupted the watermark
            raise WatermarkingException("No watermark found in image - image may not be watermarked or may have been modified")
        except Exception as e:
            error_msg = str(e).lower()
            # Check for common "no watermark" indicators
            if 'index' in error_msg or 'out of range' in error_msg or 'empty' in error_msg:
                raise WatermarkingException("No watermark found in image - image may not be watermarked or may have been modified")
            raise WatermarkingException(f"Failed to extract watermark: {str(e)}")
    
    def supports_format(self, file_extension: str) -> bool:
        """Check if format is supported"""
        supported = ['.png']  # stegano LSB works best with PNG
        return file_extension.lower() in supported

