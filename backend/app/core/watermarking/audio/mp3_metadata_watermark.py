"""MP3 metadata watermarking - embeds watermark in ID3 tags (survives compression)"""
import io
import json
import base64
from typing import BinaryIO

try:
    from mutagen.mp3 import MP3
    from mutagen.id3 import ID3, TIT2, TPE1, TALB, TCON, TCOM, COMM, USLT
    MUTAGEN_AVAILABLE = True
except ImportError:
    MUTAGEN_AVAILABLE = False

from app.core.watermarking.base import BaseWatermarker
from app.utils.exceptions import WatermarkingException


class MP3MetadataWatermarker(BaseWatermarker):
    """Watermarker that embeds hash in MP3 ID3 tags (survives compression)"""
    
    WATERMARK_TAG = "WMPayload"  # Custom tag name
    HASH_TAG = "WMHash"  # Hash tag name
    
    def embed(self, file: BinaryIO, watermark_data: bytes) -> bytes:
        """Embed watermark into MP3 ID3 tags"""
        if not MUTAGEN_AVAILABLE:
            raise WatermarkingException(
                "mutagen library not available. Install with: pip install mutagen"
            )
        
        try:
            # Encode watermark data
            watermark_b64 = base64.b64encode(watermark_data).decode('utf-8')
            watermark_str = watermark_data.decode('utf-8', errors='ignore')
            
            # Mutagen modifies files in place, so we need to work with a copy
            from tempfile import NamedTemporaryFile
            import os
            import shutil
            
            # Create temporary file
            with NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
                tmp_path = tmp_file.name
                file.seek(0)
                shutil.copyfileobj(file, tmp_file)
            
            try:
                # Load MP3 file
                audio_file = MP3(tmp_path)
                
                # Get or create ID3 tags
                try:
                    audio_file.add_tags()
                except:
                    pass  # Tags already exist
                
                # Add watermark tags - use multiple tags for redundancy
                # 1. Comment tag (COMM) - most reliable
                audio_file.tags.add(COMM(
                    encoding=3,  # UTF-8
                    lang='eng',
                    desc=self.WATERMARK_TAG,
                    text=watermark_b64[:800]  # Limit length
                ))
                
                # 2. Lyrics tag (USLT) - also commonly preserved
                audio_file.tags.add(USLT(
                    encoding=3,
                    lang='eng',
                    desc=self.HASH_TAG,
                    text=watermark_str[:500]
                ))
                
                # 3. Add second comment if watermark is long
                if len(watermark_b64) > 800:
                    audio_file.tags.add(COMM(
                        encoding=3,
                        lang='eng',
                        desc=f"{self.WATERMARK_TAG}_2",
                        text=watermark_b64[800:1600] if len(watermark_b64) > 800 else ""
                    ))
                
                # Save tags (mutagen modifies file in place)
                audio_file.save(v1=2)  # Use ID3v2.3
                
                # Read the modified file
                with open(tmp_path, 'rb') as f:
                    result = f.read()
                
                return result
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
            
        except Exception as e:
            raise WatermarkingException(f"Failed to embed MP3 metadata watermark: {str(e)}")
    
    def extract(self, file: BinaryIO) -> bytes:
        """Extract watermark from MP3 ID3 tags"""
        if not MUTAGEN_AVAILABLE:
            raise WatermarkingException(
                "mutagen library not available. Install with: pip install mutagen"
            )
        
        try:
            file.seek(0)
            audio_file = MP3(file)
            
            if not audio_file.tags:
                raise WatermarkingException("No ID3 tags found in MP3 file")
            
            # Try to extract from comment tag first
            watermark_data = None
            
            # Check COMM tags
            for key in audio_file.tags.keys():
                if key.startswith('COMM'):
                    frame = audio_file.tags[key]
                    if hasattr(frame, 'desc') and frame.desc == self.WATERMARK_TAG:
                        watermark_b64 = frame.text[0] if isinstance(frame.text, list) else str(frame.text)
                        try:
                            watermark_data = base64.b64decode(watermark_b64)
                            break
                        except:
                            continue
            
            # If not found, try USLT (lyrics)
            if not watermark_data:
                for key in audio_file.tags.keys():
                    if key.startswith('USLT'):
                        frame = audio_file.tags[key]
                        if hasattr(frame, 'desc') and frame.desc == self.HASH_TAG:
                            watermark_str = frame.text if isinstance(frame.text, str) else frame.text[0]
                            try:
                                watermark_data = watermark_str.encode('utf-8')
                                break
                            except:
                                continue
            
            # Try to reconstruct from multiple comment tags
            if not watermark_data:
                comments = []
                for key in sorted(audio_file.tags.keys()):
                    if key.startswith('COMM'):
                        frame = audio_file.tags[key]
                        if hasattr(frame, 'desc') and self.WATERMARK_TAG in frame.desc:
                            text = frame.text[0] if isinstance(frame.text, list) else str(frame.text)
                            comments.append(text)
                
                if comments:
                    combined = ''.join(comments)
                    try:
                        watermark_data = base64.b64decode(combined)
                    except:
                        watermark_data = combined.encode('utf-8')
            
            if not watermark_data:
                raise WatermarkingException("No watermark found in MP3 ID3 tags")
            
            return watermark_data
            
        except WatermarkingException:
            raise
        except Exception as e:
            raise WatermarkingException(f"Failed to extract MP3 metadata watermark: {str(e)}")
    
    def supports_format(self, file_extension: str) -> bool:
        """Check if format is supported"""
        return file_extension.lower() == '.mp3'

