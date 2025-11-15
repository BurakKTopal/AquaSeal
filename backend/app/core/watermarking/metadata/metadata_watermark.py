"""Metadata-based watermarking - embeds hash in file metadata"""
import io
import json
import base64
from typing import BinaryIO
from PIL import Image
from PIL.ExifTags import TAGS

try:
    from PIL.ExifTags import GPSTAGS
except ImportError:
    GPSTAGS = {}

from app.core.watermarking.base import BaseWatermarker
from app.utils.exceptions import WatermarkingException


class MetadataWatermarker(BaseWatermarker):
    """Watermarker that embeds hash in file metadata (EXIF, PNG chunks, etc.)"""
    
    # Use obscure but valid EXIF/PNG tag names to avoid detection
    WATERMARK_TAG_PREFIX = "WM"  # Watermark prefix
    HASH_TAG = "WMHash"  # Hash tag name
    PAYLOAD_TAG = "WMPayload"  # Full payload tag name
    
    def embed(self, file: BinaryIO, watermark_data: bytes) -> bytes:
        """Embed watermark into image metadata"""
        try:
            file.seek(0)
            image = Image.open(file)
            
            # Convert watermark to string and encode for metadata
            watermark_str = watermark_data.decode('utf-8', errors='ignore')
            
            # Encode as base64 to avoid special character issues
            watermark_b64 = base64.b64encode(watermark_data).decode('utf-8')
            
            # Get format
            format = image.format or 'PNG'
            
            # Embed based on format
            if format in ['JPEG', 'JPG']:
                return self._embed_jpeg_metadata(image, watermark_b64, watermark_str)
            elif format == 'PNG':
                return self._embed_png_metadata(image, watermark_b64, watermark_str)
            elif format in ['TIFF', 'TIF']:
                return self._embed_tiff_metadata(image, watermark_b64, watermark_str)
            else:
                # For other formats, try to convert to PNG and embed
                return self._embed_png_metadata(image, watermark_b64, watermark_str)
                
        except Exception as e:
            raise WatermarkingException(f"Failed to embed metadata watermark: {str(e)}")
    
    def _embed_jpeg_metadata(self, image: Image.Image, watermark_b64: str, watermark_str: str) -> bytes:
        """Embed watermark in JPEG EXIF metadata"""
        # Get existing EXIF
        exif_dict = image.getexif() if hasattr(image, 'getexif') else {}
        
        # Create new EXIF dict preserving existing data
        new_exif = {}
        if exif_dict:
            for tag_id, value in exif_dict.items():
                new_exif[tag_id] = value
        
        # Embed in UserComment field (tag 37510)
        # Use base64 encoded data
        comment_text = watermark_b64[:2000]  # Limit length
        new_exif[37510] = comment_text  # UserComment
        
        # Also embed in ImageDescription (tag 270) for redundancy
        try:
            desc_text = f"{self.WATERMARK_TAG_PREFIX}:{watermark_b64[:500]}"
            new_exif[270] = desc_text  # ImageDescription
        except:
            pass
        
        # Save image with updated EXIF
        output = io.BytesIO()
        # Create EXIF object
        exif_bytes = image.getexif() if hasattr(image, 'getexif') else Image.Exif()
        for tag_id, value in new_exif.items():
            exif_bytes[tag_id] = value
        
        image.save(output, format='JPEG', quality=95, exif=exif_bytes)
        output.seek(0)
        return output.read()
    
    def _embed_png_metadata(self, image: Image.Image, watermark_b64: str, watermark_str: str) -> bytes:
        """Embed watermark in PNG text chunks"""
        # PNG supports text chunks (tEXt, zTXt, iTXt)
        # We'll use tEXt chunks which are uncompressed and always preserved
        
        # Create new image with metadata
        output = io.BytesIO()
        
        # Save image first
        image.save(output, format='PNG')
        output.seek(0)
        
        # Read PNG bytes
        png_bytes = output.read()
        
        # Embed watermark in PNG text chunks
        # PNG format: [PNG signature][IHDR][...chunks...][IEND]
        # Text chunks format: tEXt + keyword + null + text
        
        # Find IEND chunk position (last 12 bytes: IEND + CRC)
        iend_pos = png_bytes.rfind(b'IEND')
        if iend_pos == -1:
            raise WatermarkingException("Invalid PNG format")
        
        # Create watermark chunks
        watermark_chunks = []
        
        # Split watermark into chunks if too long (max 79 chars per keyword)
        chunk_size = 2000
        for i in range(0, len(watermark_b64), chunk_size):
            chunk_data = watermark_b64[i:i+chunk_size]
            keyword = f"{self.HASH_TAG}{i//chunk_size}" if i > 0 else self.HASH_TAG
            keyword_bytes = keyword.encode('latin-1')
            text_bytes = chunk_data.encode('latin-1')
            
            # Create tEXt chunk: [length][tEXt][keyword\0][text][CRC]
            chunk_type = b'tEXt'
            chunk_data_bytes = keyword_bytes + b'\x00' + text_bytes
            
            # Calculate CRC32
            import zlib
            crc = zlib.crc32(chunk_type + chunk_data_bytes) & 0xffffffff
            
            # Build chunk: length (4 bytes, big-endian) + type + data + CRC
            chunk_length = len(chunk_data_bytes).to_bytes(4, 'big')
            chunk_crc = crc.to_bytes(4, 'big')
            chunk = chunk_length + chunk_type + chunk_data_bytes + chunk_crc
            
            watermark_chunks.append(chunk)
        
        # Insert chunks before IEND
        result = png_bytes[:iend_pos] + b''.join(watermark_chunks) + png_bytes[iend_pos:]
        
        return result
    
    def _embed_tiff_metadata(self, image: Image.Image, watermark_b64: str, watermark_str: str) -> bytes:
        """Embed watermark in TIFF metadata"""
        # TIFF uses EXIF-like structure
        exif_dict = image.getexif() if hasattr(image, 'getexif') else {}
        
        if isinstance(exif_dict, dict):
            exif_data = exif_dict
        else:
            exif_data = {}
            if exif_dict:
                for tag_id, value in exif_dict.items():
                    tag = TAGS.get(tag_id, tag_id)
                    exif_data[tag] = value
        
        exif_data[37510] = watermark_str[:2000]  # UserComment
        
        output = io.BytesIO()
        image.save(output, format='TIFF', exif=image.getexif() if hasattr(image, 'getexif') else None)
        output.seek(0)
        return output.read()
    
    def extract(self, file: BinaryIO) -> bytes:
        """Extract watermark from image metadata"""
        try:
            file.seek(0)
            image = Image.open(file)
            format = image.format or 'PNG'
            
            if format in ['JPEG', 'JPG']:
                return self._extract_jpeg_metadata(image)
            elif format == 'PNG':
                return self._extract_png_metadata(file)
            elif format in ['TIFF', 'TIF']:
                return self._extract_tiff_metadata(image)
            else:
                # Try PNG extraction as fallback
                return self._extract_png_metadata(file)
                
        except Exception as e:
            raise WatermarkingException(f"Failed to extract metadata watermark: {str(e)}")
    
    def _extract_jpeg_metadata(self, image: Image.Image) -> bytes:
        """Extract watermark from JPEG EXIF metadata"""
        exif_dict = image.getexif() if hasattr(image, 'getexif') else {}
        
        if not exif_dict:
            raise WatermarkingException("No EXIF metadata found")
        
        # Try UserComment first (tag 37510)
        watermark_str = None
        
        # Check UserComment (37510)
        if 37510 in exif_dict:
            value = exif_dict[37510]
            if isinstance(value, bytes):
                watermark_str = value.decode('utf-8', errors='ignore')
            elif isinstance(value, str):
                watermark_str = value
            elif isinstance(value, tuple) and len(value) > 1:
                # EXIF UserComment format: (encoding, text)
                watermark_str = value[1] if isinstance(value[1], str) else str(value[1])
        
        # Also check ImageDescription (270) for our watermark tag
        if not watermark_str and 270 in exif_dict:
            value = exif_dict[270]
            if isinstance(value, str) and value.startswith(self.WATERMARK_TAG_PREFIX):
                watermark_str = value.split(':', 1)[1] if ':' in value else None
        
        if watermark_str:
            try:
                # Try to decode as base64 first
                return base64.b64decode(watermark_str)
            except:
                # If not base64, try to parse JSON
                try:
                    return json.loads(watermark_str).encode('utf-8')
                except:
                    # Return as string
                    return watermark_str.encode('utf-8')
        
        raise WatermarkingException("No watermark found in JPEG metadata")
    
    def _extract_png_metadata(self, file: BinaryIO) -> bytes:
        """Extract watermark from PNG text chunks"""
        file.seek(0)
        png_bytes = file.read()
        
        # Find all tEXt chunks with our watermark tag
        watermark_chunks = []
        pos = 8  # Skip PNG signature
        
        while pos < len(png_bytes) - 12:
            # Read chunk length
            if pos + 4 > len(png_bytes):
                break
            
            chunk_length = int.from_bytes(png_bytes[pos:pos+4], 'big')
            pos += 4
            
            # Read chunk type
            if pos + 4 > len(png_bytes):
                break
            
            chunk_type = png_bytes[pos:pos+4]
            pos += 4
            
            # Check if it's a tEXt chunk
            if chunk_type == b'tEXt':
                # Read chunk data
                if pos + chunk_length > len(png_bytes):
                    break
                
                chunk_data = png_bytes[pos:pos+chunk_length]
                pos += chunk_length
                
                # Skip CRC
                pos += 4
                
                # Parse keyword and text
                null_pos = chunk_data.find(b'\x00')
                if null_pos != -1:
                    keyword = chunk_data[:null_pos].decode('latin-1', errors='ignore')
                    text = chunk_data[null_pos+1:].decode('latin-1', errors='ignore')
                    
                    # Check if it's our watermark tag
                    if keyword.startswith(self.HASH_TAG):
                        watermark_chunks.append((keyword, text))
            else:
                # Skip this chunk
                pos += chunk_length + 4  # +4 for CRC
            
            # Stop at IEND
            if chunk_type == b'IEND':
                break
        
        if not watermark_chunks:
            raise WatermarkingException("No watermark found in PNG metadata")
        
        # Reconstruct watermark from chunks
        watermark_chunks.sort(key=lambda x: x[0])  # Sort by chunk index
        watermark_b64 = ''.join(chunk[1] for chunk in watermark_chunks)
        
        try:
            return base64.b64decode(watermark_b64)
        except:
            return watermark_b64.encode('utf-8')
    
    def _extract_tiff_metadata(self, image: Image.Image) -> bytes:
        """Extract watermark from TIFF metadata"""
        return self._extract_jpeg_metadata(image)  # Same as JPEG
    
    def supports_format(self, file_extension: str) -> bool:
        """Check if format is supported"""
        supported = ['.jpg', '.jpeg', '.png', '.tiff', '.tif']
        return file_extension.lower() in supported

