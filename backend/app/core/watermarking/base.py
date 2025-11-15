"""Base watermarking interface"""
from abc import ABC, abstractmethod
from typing import BinaryIO, Tuple


class BaseWatermarker(ABC):
    """Base class for watermarking implementations"""
    
    @abstractmethod
    def embed(self, file: BinaryIO, watermark_data: bytes) -> bytes:
        """Embed watermark into file"""
        pass
    
    @abstractmethod
    def extract(self, file: BinaryIO) -> bytes:
        """Extract watermark from file"""
        pass
    
    @abstractmethod
    def supports_format(self, file_extension: str) -> bool:
        """Check if format is supported"""
        pass

