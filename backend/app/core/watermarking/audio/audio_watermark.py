"""Robust audio watermarking using DCT-based steganography with adaptive extraction"""

import io
import hashlib
import numpy as np
from typing import BinaryIO, Optional, Tuple, List

try:
    import librosa
    import soundfile as sf
    from scipy.fft import dct, idct
except ImportError:
    librosa = None
    sf = None
    dct = None
    idct = None

from app.core.watermarking.base import BaseWatermarker
from app.utils.exceptions import WatermarkingException


class AudioWatermarker(BaseWatermarker):
    """Robust audio watermarker with adaptive extraction and multiple fallback strategies"""

    # Standard sync pattern - not personalized to ensure extraction works
    MAGIC_PATTERN = np.array([1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1])
    
    def __init__(self, alpha: float = 0.05, block_size: int = 1024, personalization_hash: Optional[str] = None):
        """
        Initialize audio watermarker
        
        Args:
            alpha: Base watermark strength (0.01 to 0.2 recommended)
            block_size: Size of DCT blocks for processing
            personalization_hash: Optional hash for parameter variation (stored in watermark)
        """
        if librosa is None or sf is None or dct is None or idct is None:
            raise WatermarkingException(
                "Required libraries not installed. "
                "Install with: pip install librosa soundfile scipy"
            )
        if not 0.01 <= alpha <= 0.5:
            raise WatermarkingException("Alpha must be between 0.01 and 0.5")
            
        self.base_alpha = alpha
        self.base_block_size = block_size
        self.personalization_hash = personalization_hash
        
        # Use standard parameters - personalization stored in watermark data itself
        self.alpha = alpha
        self.block_size = block_size
    
    def _prepare_watermark(self, data: bytes, include_params: bool = True) -> np.ndarray:
        """Prepare watermark with headers and optional parameter info"""
        # Optionally include personalization hash in watermark for verification
        if include_params and self.personalization_hash:
            # Add 8-byte hash prefix for parameter verification
            hash_bytes = hashlib.md5(self.personalization_hash.encode()).digest()[:8]
            data = hash_bytes + data
        
        # Add length header (2 bytes)
        length = len(data)
        if length > 65535:
            raise WatermarkingException("Watermark data too large (max 65535 bytes)")
        
        # Add checksum (4 bytes)
        checksum = hashlib.md5(data).digest()[:4]
        
        # Combine: length + checksum + data
        watermark_data = (
            length.to_bytes(2, 'big') + 
            checksum + 
            data
        )
        
        # Convert to bits
        bits = np.unpackbits(np.frombuffer(watermark_data, dtype=np.uint8))
        
        # Add sync pattern at the beginning
        return np.concatenate([self.MAGIC_PATTERN, bits])
    
    def _apply_dct_2d(self, data: np.ndarray, block_size: int) -> np.ndarray:
        """Apply DCT to blocks of data"""
        # Pad data to be divisible by block_size
        pad_size = (block_size - len(data) % block_size) % block_size
        padded = np.pad(data, (0, pad_size), mode='constant')
        
        # Reshape into blocks
        blocks = padded.reshape(-1, block_size)
        
        # Apply DCT to each block
        dct_blocks = np.array([dct(block, norm='ortho') for block in blocks])
        
        return dct_blocks
    
    def _apply_idct_2d(self, dct_blocks: np.ndarray, original_length: int) -> np.ndarray:
        """Apply inverse DCT to blocks"""
        # Apply IDCT to each block
        blocks = np.array([idct(block, norm='ortho') for block in dct_blocks])
        
        # Flatten and trim to original length
        data = blocks.flatten()[:original_length]
        
        return data
    
    def _embed_in_dct(self, audio_data: np.ndarray, watermark_bits: np.ndarray) -> np.ndarray:
        """Embed watermark bits using DCT on blocks"""
        original_length = len(audio_data)
        
        # Apply DCT
        dct_blocks = self._apply_dct_2d(audio_data, self.block_size)
        
        # Use coefficients 8-24 (mid frequencies, robust to compression)
        coef_start = 8
        coef_end = min(24, self.block_size // 2)
        coefs_per_block = coef_end - coef_start
        
        # Calculate total capacity
        total_capacity = len(dct_blocks) * coefs_per_block
        
        if len(watermark_bits) > total_capacity:
            raise WatermarkingException(
                f"Audio too short for watermark. Need {len(watermark_bits)} bits, "
                f"have capacity for {total_capacity}"
            )
        
        # Embed watermark using Quantization Index Modulation (QIM)
        bit_idx = 0
        for block_idx in range(len(dct_blocks)):
            if bit_idx >= len(watermark_bits):
                break
                
            for coef_idx in range(coef_start, coef_end):
                if bit_idx >= len(watermark_bits):
                    break
                
                bit = watermark_bits[bit_idx]
                coef = dct_blocks[block_idx, coef_idx]
                
                # Calculate quantization step
                delta = max(self.alpha * np.abs(coef), self.alpha * 0.001)
                
                if bit == 1:
                    # Quantize to odd multiple of delta
                    q = int(np.abs(coef) / delta)
                    dct_blocks[block_idx, coef_idx] = np.sign(coef) * delta * (q + 0.5)
                else:
                    # Quantize to even multiple of delta
                    q = int(np.abs(coef) / delta)
                    dct_blocks[block_idx, coef_idx] = np.sign(coef) * delta * q
                
                bit_idx += 1
        
        # Apply inverse DCT
        watermarked_audio = self._apply_idct_2d(dct_blocks, original_length)
        
        # Normalize to prevent clipping
        max_val = np.max(np.abs(watermarked_audio))
        if max_val > 1.0:
            watermarked_audio = watermarked_audio / max_val * 0.95
        
        return watermarked_audio
    
    def _extract_from_dct(self, audio_data: np.ndarray, block_size: int, 
                         alpha: float, max_bits: int) -> np.ndarray:
        """Extract watermark bits using DCT with specified parameters"""
        # Apply DCT
        dct_blocks = self._apply_dct_2d(audio_data, block_size)
        
        coef_start = 8
        coef_end = min(24, block_size // 2)
        
        # Extract bits
        watermark_bits = []
        bit_idx = 0
        
        for block_idx in range(len(dct_blocks)):
            if bit_idx >= max_bits:
                break
                
            for coef_idx in range(coef_start, coef_end):
                if bit_idx >= max_bits:
                    break
                
                coef = dct_blocks[block_idx, coef_idx]
                delta = max(alpha * np.abs(coef), alpha * 0.001)
                
                # Extract bit using QIM decoding
                q = np.abs(coef) / delta
                remainder = q - int(q)
                
                # If remainder is close to 0.5, it's an odd multiple (bit=1)
                # Otherwise it's an even multiple (bit=0)
                bit = 1 if remainder > 0.25 and remainder < 0.75 else 0
                
                watermark_bits.append(bit)
                bit_idx += 1
        
        return np.array(watermark_bits)
    
    def _find_sync_pattern(self, bits: np.ndarray, max_search: int = 2000) -> List[int]:
        """Find all potential sync pattern positions"""
        pattern_len = len(self.MAGIC_PATTERN)
        positions = []
        
        search_range = min(max_search, len(bits) - pattern_len)
        
        for i in range(search_range):
            matches = np.sum(bits[i:i+pattern_len] == self.MAGIC_PATTERN)
            match_ratio = matches / pattern_len
            
            # Accept positions with >65% match
            if match_ratio >= 0.65:
                positions.append((i, match_ratio))
        
        # Sort by match quality
        positions.sort(key=lambda x: x[1], reverse=True)
        return [pos for pos, _ in positions]
    
    def _try_extract_at_position(self, bits: np.ndarray, start_pos: int) -> Optional[bytes]:
        """Try to extract valid watermark data starting at a position"""
        try:
            data_bits = bits[start_pos:]
            
            if len(data_bits) < 48:  # Min: 16 (length) + 32 (checksum)
                return None
            
            # Extract length
            length_bits = data_bits[:16]
            length_bytes = np.packbits(length_bits).tobytes()
            watermark_length = int.from_bytes(length_bytes, 'big')
            
            # Validate length
            if watermark_length == 0 or watermark_length > 65535:
                return None
            
            required_bits = 48 + watermark_length * 8
            if len(data_bits) < required_bits:
                return None
            
            # Extract checksum and data
            checksum_bits = data_bits[16:48]
            checksum = np.packbits(checksum_bits).tobytes()
            
            watermark_data_bits = data_bits[48:required_bits]
            watermark_data = np.packbits(watermark_data_bits).tobytes()
            
            # Verify checksum
            computed_checksum = hashlib.md5(watermark_data).digest()[:4]
            if checksum == computed_checksum:
                return watermark_data
            
        except Exception:
            pass
        
        return None
    
    def embed(self, file: BinaryIO, watermark_data: bytes) -> bytes:
        """Embed watermark into audio file"""
        try:
            file.seek(0)
            # Check file extension to determine format
            # For MP3, we should use metadata watermarking (handled separately)
            # For other formats, use DCT watermarking
            
            # Load audio file (mono conversion for simplicity)
            audio_data, sample_rate = librosa.load(file, sr=None, mono=True)
            
            # Prepare watermark with headers
            watermark_bits = self._prepare_watermark(watermark_data)
            
            # Embed watermark
            watermarked_audio = self._embed_in_dct(audio_data, watermark_bits)
            
            # Save to bytes - use original format if possible, otherwise WAV
            output = io.BytesIO()
            # Always save as WAV for DCT watermarking (lossless)
            # The original format will be preserved in filename
            sf.write(output, watermarked_audio, sample_rate, format='WAV')
            output.seek(0)
            
            return output.read()
            
        except Exception as e:
            raise WatermarkingException(f"Failed to embed watermark in audio: {str(e)}")
    
    def extract(self, file: BinaryIO) -> bytes:
        """Extract watermark from audio file with multiple fallback strategies"""
        try:
            file.seek(0)
            # Load audio file
            audio_data, _ = librosa.load(file, sr=None, mono=True)
            
            # Try different parameter combinations
            param_combinations = [
                # (block_size, alpha)
                (self.block_size, self.alpha),           # Standard parameters
                (1024, 0.05),                            # Common defaults
                (1024, 0.03),                            # Lower alpha
                (1024, 0.07),                            # Higher alpha
                (512, 0.05),                             # Smaller blocks
                (2048, 0.05),                            # Larger blocks
            ]
            
            errors = []
            
            for block_size, alpha in param_combinations:
                try:
                    # Calculate extraction capacity
                    dct_blocks_count = (len(audio_data) + block_size - 1) // block_size
                    coefs_per_block = min(24, block_size // 2) - 8
                    max_bits = int(dct_blocks_count * coefs_per_block * 1.2)
                    max_bits = max(max_bits, 2000)  # Ensure minimum extraction
                    
                    # Extract bits
                    extracted_bits = self._extract_from_dct(audio_data, block_size, alpha, max_bits)
                    
                    if len(extracted_bits) == 0:
                        continue
                    
                    # Find potential sync pattern positions
                    sync_positions = self._find_sync_pattern(extracted_bits)
                    
                    # Try each sync position
                    for sync_pos in sync_positions:
                        # Try with sync pattern offset
                        data_start = sync_pos + len(self.MAGIC_PATTERN)
                        watermark_data = self._try_extract_at_position(extracted_bits, data_start)
                        
                        if watermark_data is not None:
                            return watermark_data
                    
                    # Also try without sync pattern (brute force search)
                    for start_offset in range(0, min(500, len(extracted_bits) - 100), 8):
                        watermark_data = self._try_extract_at_position(extracted_bits, start_offset)
                        if watermark_data is not None:
                            return watermark_data
                    
                except Exception as e:
                    errors.append(f"block_size={block_size}, alpha={alpha}: {str(e)}")
                    continue
            
            # If we get here, extraction failed with all parameter combinations
            error_summary = "; ".join(errors[:3])  # Show first 3 errors
            raise WatermarkingException(
                f"No watermark detected. Tried {len(param_combinations)} parameter combinations. "
                f"Sample errors: {error_summary}. "
                f"The audio may not contain a watermark or it may have been corrupted."
            )
            
        except WatermarkingException:
            raise
        except Exception as e:
            raise WatermarkingException(f"Failed to extract watermark from audio: {str(e)}")
    
    def supports_format(self, file_extension: str) -> bool:
        """Check if format is supported"""
        supported = ['.wav', '.mp3', '.flac', '.ogg', '.m4a', '.aac']
        return file_extension.lower() in supported