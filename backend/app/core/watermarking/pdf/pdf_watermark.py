"""PDF watermarking - embeds hash in PDF metadata"""
import io
import json
import base64
from typing import BinaryIO

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    try:
        from PyPDF2 import PdfReader, PdfWriter
    except ImportError:
        PdfReader = None
        PdfWriter = None

from app.core.watermarking.base import BaseWatermarker
from app.utils.exceptions import WatermarkingException


class PDFWatermarker(BaseWatermarker):
    """Watermarker that embeds hash in PDF metadata"""
    
    WATERMARK_KEY = "WMHash"  # Custom metadata key
    PAYLOAD_KEY = "WMPayload"  # Full payload key
    
    def __init__(self):
        """Initialize PDF watermarker"""
        pass
    
    def embed(self, file: BinaryIO, watermark_data: bytes) -> bytes:
        """Embed watermark into PDF metadata"""
        if PdfReader is None or PdfWriter is None:
            raise WatermarkingException(
                "PDF library not available. Please install pypdf: pip install pypdf"
            )
        
        try:
            file.seek(0)
            
            # Read PDF
            pdf_reader = PdfReader(file)
            pdf_writer = PdfWriter()
            
            # Copy all pages
            for page in pdf_reader.pages:
                pdf_writer.add_page(page)
            
            # Encode watermark data as base64 for metadata
            watermark_b64 = base64.b64encode(watermark_data).decode('utf-8')
            watermark_str = watermark_data.decode('utf-8', errors='ignore')
            
            # Get existing metadata and convert to dict
            metadata = {}
            if pdf_reader.metadata:
                # Copy existing metadata
                for key, value in pdf_reader.metadata.items():
                    if value:
                        metadata[key] = str(value)
            
            # Add custom metadata fields
            metadata['/WMHash'] = watermark_b64[:2000]  # Limit length
            metadata['/WMPayload'] = watermark_str[:1000]  # Limit length
            
            # Also embed in standard metadata fields for redundancy
            if '/Title' in metadata:
                # Append watermark hash to title (subtle)
                metadata['/Title'] = f"{metadata['/Title']} [{watermark_b64[:16]}]"
            else:
                metadata['/Title'] = watermark_b64[:100]
            
            # Set metadata
            pdf_writer.add_metadata(metadata)
            
            # Write PDF to bytes
            output = io.BytesIO()
            pdf_writer.write(output)
            output.seek(0)
            
            return output.read()
            
        except Exception as e:
            raise WatermarkingException(f"Failed to embed PDF watermark: {str(e)}")
    
    def extract(self, file: BinaryIO) -> bytes:
        """Extract watermark from PDF metadata"""
        if PdfReader is None:
            raise WatermarkingException(
                "PDF library not available. Please install pypdf: pip install pypdf"
            )
        
        try:
            file.seek(0)
            pdf_reader = PdfReader(file)
            
            # Get metadata
            metadata = {}
            if pdf_reader.metadata:
                for key, value in pdf_reader.metadata.items():
                    if value:
                        metadata[key] = str(value)
            
            # Try custom metadata fields first
            watermark_b64 = None
            
            if '/WMHash' in metadata:
                watermark_b64 = metadata['/WMHash']
            elif '/WMPayload' in metadata:
                watermark_str = metadata['/WMPayload']
                try:
                    # Try to decode as JSON first
                    return json.loads(watermark_str).encode('utf-8')
                except:
                    return watermark_str.encode('utf-8')
            
            # Also check Title field for embedded hash
            if not watermark_b64 and '/Title' in metadata:
                title = metadata['/Title']
                # Check if title contains watermark hash in brackets
                if '[' in title and ']' in title:
                    start = title.rfind('[') + 1
                    end = title.rfind(']')
                    if end > start:
                        potential_hash = title[start:end]
                        if len(potential_hash) >= 16:  # Likely a hash
                            watermark_b64 = potential_hash
            
            if watermark_b64:
                try:
                    # Try to decode as base64
                    return base64.b64decode(watermark_b64)
                except:
                    # If not base64, return as string
                    return watermark_b64.encode('utf-8')
            
            raise WatermarkingException("No watermark found in PDF metadata")
            
        except WatermarkingException:
            raise
        except Exception as e:
            raise WatermarkingException(f"Failed to extract PDF watermark: {str(e)}")
    
    def supports_format(self, file_extension: str) -> bool:
        """Check if format is supported"""
        return file_extension.lower() == '.pdf'

