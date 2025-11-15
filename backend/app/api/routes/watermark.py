"""Watermark embedding/extraction endpoint"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.services.watermark_service import WatermarkService
from app.api.dependencies import get_watermark_service
from app.utils.file_validator import get_file_type
from app.utils.exceptions import WatermarkingException
from pathlib import Path

router = APIRouter()


@router.post("/extract")
async def extract_watermark(
    file: UploadFile = File(...),
    watermark_service: WatermarkService = Depends(get_watermark_service)
):
    """Extract watermark from file"""
    try:
        file_type = get_file_type(file)
        file_extension = Path(file.filename).suffix
        
        file_content = await file.read()
        import io
        file_io = io.BytesIO(file_content)
        
        watermark_data = watermark_service.extract_watermark(
            file_io, file_type, file_extension
        )
        
        return {
            "success": True,
            "watermark_data": watermark_data.decode('utf-8', errors='ignore')
        }
    except WatermarkingException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

