"""PDF watermarking - embeds hash in PDF metadata and adds visual logo watermark"""
import io
import json
import base64
import os
from typing import BinaryIO
from pathlib import Path

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    try:
        from PyPDF2 import PdfReader, PdfWriter
    except ImportError:
        PdfReader = None
        PdfWriter = None

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.utils import ImageReader
    from PIL import Image
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from app.core.watermarking.base import BaseWatermarker
from app.utils.exceptions import WatermarkingException


class PDFWatermarker(BaseWatermarker):
    """Watermarker that embeds hash in PDF metadata and adds visual logo watermark"""
    
    WATERMARK_KEY = "WMHash"  # Custom metadata key
    PAYLOAD_KEY = "WMPayload"  # Full payload key
    
    def __init__(self):
        """Initialize PDF watermarker with logo path"""
        # Try to find logo file
        logo_paths = [
            Path(__file__).parent.parent.parent.parent / "assets" / "logo.svg",
            Path(__file__).parent.parent.parent.parent.parent / "backend" / "app" / "assets" / "logo.svg",
        ]
        self.logo_path = None
        for path in logo_paths:
            if path.exists():
                self.logo_path = path
                break
    
    def embed(self, file: BinaryIO, watermark_data: bytes) -> bytes:
        """Embed watermark into PDF metadata and as invisible text"""
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
            
            # Add visual logo watermark to all pages
            if REPORTLAB_AVAILABLE and self.logo_path and self.logo_path.exists():
                try:
                    watermarked_pdf = self._add_logo_watermark(pdf_writer)
                    return watermarked_pdf
                except Exception as e:
                    # Continue without logo watermark - metadata is still embedded
                    pass
            
            # Write PDF to bytes
            output = io.BytesIO()
            pdf_writer.write(output)
            output.seek(0)
            
            return output.read()
            
        except Exception as e:
            raise WatermarkingException(f"Failed to embed PDF watermark: {str(e)}")
    
    def _add_logo_watermark(self, pdf_writer: PdfWriter) -> bytes:
        """Add logo watermark overlay to PDF pages"""
        if not REPORTLAB_AVAILABLE:
            raise WatermarkingException("reportlab not available for logo watermarking")
        
        # Create watermark PDF with logo
        watermark_buffer = io.BytesIO()
        c = canvas.Canvas(watermark_buffer, pagesize=A4)
        
        # Convert SVG to PNG if needed, or use directly
        try:
            # Try to open as image (PIL can handle SVG if cairosvg is available)
            if self.logo_path.suffix.lower() == '.svg':
                # For SVG, we'll create a simple text/logo watermark instead
                # In production, you'd use cairosvg to convert SVG to PNG
                # For now, create a text watermark
                c.setFont("Helvetica-Bold", 24)
                c.setFillColorRGB(0.2, 0.4, 0.8, alpha=0.3)  # Blue with transparency
                c.rotate(45)
                c.drawString(200, 100, "AquaSeal")
                c.rotate(-45)
            else:
                # Use PIL to open image
                img = Image.open(self.logo_path)
                # Resize logo (make it smaller for watermark)
                img.thumbnail((150, 150), Image.Resampling.LANCZOS)
                
                # Get page dimensions
                page_width, page_height = A4
                
                # Position logo in bottom-right corner with transparency
                logo_width, logo_height = img.size
                x = page_width - logo_width - 30
                y = 30
                
                # Draw logo with transparency
                c.saveState()
                c.setFillAlpha(0.3)  # 30% opacity
                c.drawImage(ImageReader(img), x, y, width=logo_width, height=logo_height)
                c.restoreState()
        except Exception as e:
            # Fallback: text watermark
            c.setFont("Helvetica-Bold", 20)
            c.setFillColorRGB(0.2, 0.4, 0.8, alpha=0.3)
            c.rotate(45)
            c.drawString(200, 100, "AquaSeal")
            c.rotate(-45)
        
        c.save()
        watermark_buffer.seek(0)
        
        # Merge watermark PDF with original pages
        watermark_reader = PdfReader(watermark_buffer)
        watermark_page = watermark_reader.pages[0]
        
        # Apply watermark to all pages
        for i, page in enumerate(pdf_writer.pages):
            # Merge watermark page with content page
            page.merge_page(watermark_page)
        
        # Write final PDF
        output = io.BytesIO()
        pdf_writer.write(output)
        output.seek(0)
        
        return output.read()
    
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

