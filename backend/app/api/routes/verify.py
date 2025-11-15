"""Verification endpoint"""
import io
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.models.schemas import VerificationResponse
from app.services.verification_service import VerificationService
from app.api.dependencies import get_verification_service
from app.utils.file_validator import get_file_type
from pathlib import Path

router = APIRouter()


@router.post("/verify", response_model=VerificationResponse)
async def verify_watermark(
    file: UploadFile = File(...),
    verification_service: VerificationService = Depends(get_verification_service)
):
    """Verify watermark in file"""
    try:
        file_type = get_file_type(file)
        file_extension = Path(file.filename).suffix
        
        file_content = await file.read()
        file_io = io.BytesIO(file_content)
        
        result = await verification_service.verify_watermark(
            file_io, file_type, file_extension
        )
        
        return VerificationResponse(**result)
    except Exception as e:
        return VerificationResponse(
            verified=False,
            watermark_found=False,
            message=f"Verification error: {str(e)}"
        )

