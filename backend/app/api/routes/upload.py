"""File upload endpoint"""
import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse

from app.config import settings
from app.models.schemas import MetadataInput, UploadResponse
from app.services.watermark_service import WatermarkService
from app.services.file_service import save_uploaded_file, delete_file
from app.core.camp.nft_service import NFTService
from app.api.dependencies import get_watermark_service, get_nft_service
from app.utils.file_validator import validate_image_file, validate_audio_file, validate_pdf_file, get_file_type
from app.utils.exceptions import FileValidationException, WatermarkingException
from pathlib import Path
import os

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    license: str = Form(...),
    personal_info: str = Form(None),
    watermark_service: WatermarkService = Depends(get_watermark_service),
    nft_service: NFTService = Depends(get_nft_service)
):
    """
    Upload file and embed watermark
    """
    try:
        # Validate file
        file_type = get_file_type(file)
        if file_type == "image":
            validate_image_file(file)
        elif file_type == "audio":
            validate_audio_file(file)
        elif file_type == "pdf":
            validate_pdf_file(file)
        
        file_extension = Path(file.filename).suffix
        
        # Prepare metadata
        metadata = {
            "personal_info": personal_info,
            "license": license
        }
        
        # Read file content
        file_content = await file.read()
        file_io = io.BytesIO(file_content)
        
        # Embed watermark
        watermarked_bytes, watermark_hash = watermark_service.embed_watermark(
            file=file_io,
            file_type=file_type,
            file_extension=file_extension,
            user_id=user_id,
            metadata=metadata,
            license=license
        )
        
        # Save watermarked file
        import time
        timestamp = int(time.time())
        watermarked_filename = f"watermarked_{timestamp}_{Path(file.filename).stem}{file_extension}"
        watermarked_path = os.path.join(settings.UPLOAD_DIR, watermarked_filename)
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        with open(watermarked_path, "wb") as f:
            f.write(watermarked_bytes)
        
        # Note: CAMP network integration is handled by frontend using Origin SDK
        # Backend returns watermark hash, frontend automatically mints IpNFT
        # The nft_id will be set by the frontend after minting
        nft_id = None
        
        return UploadResponse(
            success=True,
            message="File watermarked successfully",
            watermarked_file_url=f"/api/v1/download/{watermarked_filename}",
            watermark_hash=watermark_hash,
            nft_id=nft_id
        )
    except FileValidationException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except WatermarkingException as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/download/{filename}")
async def download_file(filename: str):
    """Download watermarked file"""
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

