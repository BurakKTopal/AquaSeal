"""Image watermarking using invisible-watermark library"""
import io
from typing import BinaryIO
from PIL import Image
import numpy as np

try:
    from iw import WatermarkEncoder, WatermarkDecoder
    INVISIBLE_WATERMARK_AVAILABLE = True
    INVISIBLE_WATERMARK_LEGACY = False
except ImportError:
    try:
        from invisible_watermark import WaterMark
        INVISIBLE_WATERMARK_AVAILABLE = True
        INVISIBLE_WATERMARK_LEGACY = True
    except ImportError:
        WaterMark = None
        WatermarkEncoder = None
        WatermarkDecoder = None
        INVISIBLE_WATERMARK_AVAILABLE = False
        INVISIBLE_WATERMARK_LEGACY = False

from app.core.watermarking.base import BaseWatermarker
from app.utils.exceptions import WatermarkingException


class InvisibleWatermarker(BaseWatermarker):
    """Image watermarker using invisible-watermark library"""
    
    def __init__(self, password: int = 1):
        """Initialize watermarker"""
        if not INVISIBLE_WATERMARK_AVAILABLE:
            raise WatermarkingException(
                "invisible-watermark library not installed. Install with: pip install invisible-watermark"
            )
        self.password = password
        if INVISIBLE_WATERMARK_LEGACY:
            self.watermarker = WaterMark(password1=password, password2=password)
            self.legacy_mode = True
        else:
            self.encoder = WatermarkEncoder(password)
            self.decoder = WatermarkDecoder(password)
            self.legacy_mode = False
    
    def embed(self, file: BinaryIO, watermark_data: bytes) -> bytes:
        """Embed watermark into image"""
        try:
            # Read image
            file.seek(0)
            image = Image.open(file)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            img_array = np.array(image)
            
            # Embed watermark
            # invisible-watermark expects string watermark
            watermark_str = watermark_data.decode('utf-8', errors='ignore')
            
            if self.legacy_mode:
                self.watermarker.read_img(img_array)
                self.watermarker.read_wm(watermark_str, mode='str')
                watermarked_array = self.watermarker.embed()
            else:
                # New API
                self.encoder.set_watermark('bytes', watermark_data)
                watermarked_array = self.encoder.encode(img_array, 'dwtDct')
            
            # Convert back to PIL Image
            watermarked_image = Image.fromarray(watermarked_array.astype(np.uint8))
            
            # Save to bytes
            output = io.BytesIO()
            # Determine format from original
            format = image.format or 'PNG'
            watermarked_image.save(output, format=format)
            output.seek(0)
            
            return output.read()
        except Exception as e:
            raise WatermarkingException(f"Failed to embed watermark: {str(e)}")
    
    def extract(self, file: BinaryIO) -> bytes:
        """Extract watermark from image"""
        try:
            # Read image
            file.seek(0)
            image = Image.open(file)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            img_array = np.array(image)
            
            # Extract watermark
            if self.legacy_mode:
                self.watermarker.read_img(img_array)
                watermark_str = self.watermarker.extract(mode='str')
                if not watermark_str or len(watermark_str.strip()) == 0:
                    raise WatermarkingException("No watermark found in image")
                return watermark_str.encode('utf-8')
            else:
                # New API
                watermark_bytes = self.decoder.decode(img_array, 'dwtDct', 'bytes')
                if not watermark_bytes or len(watermark_bytes) == 0:
                    raise WatermarkingException("No watermark found in image")
                return watermark_bytes
        except (IndexError, ValueError, AttributeError) as e:
            # These errors typically indicate no watermark is present
            error_msg = str(e).lower()
            if 'index' in error_msg or 'out of range' in error_msg or 'empty' in error_msg:
                raise WatermarkingException("No watermark found in image - image may not be watermarked or may have been modified")
            raise WatermarkingException(f"Failed to extract watermark: {str(e)}")
        except Exception as e:
            error_msg = str(e).lower()
            # Check for common "no watermark" indicators
            if 'no watermark' in error_msg or 'empty' in error_msg or 'none' in error_msg:
                raise WatermarkingException("No watermark found in image - image may not be watermarked or may have been modified")
            raise WatermarkingException(f"Failed to extract watermark: {str(e)}")
    
    def supports_format(self, file_extension: str) -> bool:
        """Check if format is supported"""
        supported = ['.jpg', '.jpeg', '.png', '.bmp']
        return file_extension.lower() in supported

