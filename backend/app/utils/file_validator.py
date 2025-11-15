"""File validation utilities"""
import os
from pathlib import Path
from typing import Optional
from fastapi import UploadFile

from app.config import settings
from app.utils.exceptions import FileValidationException


def validate_file_type(file: UploadFile, allowed_extensions: list[str]) -> None:
    """Validate that the file has an allowed extension"""
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise FileValidationException(
            f"File type {file_ext} not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )


def validate_file_size(file: UploadFile, max_size: int) -> None:
    """Validate that the file size is within limits"""
    # Read file size
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)  # Reset file pointer
    
    if file_size > max_size:
        raise FileValidationException(
            f"File size {file_size} bytes exceeds maximum allowed size of {max_size} bytes"
        )


def validate_image_file(file: UploadFile) -> None:
    """Validate image file"""
    validate_file_type(file, settings.ALLOWED_IMAGE_EXTENSIONS)
    validate_file_size(file, settings.MAX_FILE_SIZE)


def validate_audio_file(file: UploadFile) -> None:
    """Validate audio file"""
    validate_file_type(file, settings.ALLOWED_AUDIO_EXTENSIONS)
    validate_file_size(file, settings.MAX_FILE_SIZE)


def validate_pdf_file(file: UploadFile) -> None:
    """Validate PDF file"""
    validate_file_type(file, settings.ALLOWED_PDF_EXTENSIONS)
    validate_file_size(file, settings.MAX_FILE_SIZE)


def get_file_type(file: UploadFile) -> str:
    """Determine if file is image, audio, or pdf"""
    file_ext = Path(file.filename).suffix.lower()
    if file_ext in settings.ALLOWED_IMAGE_EXTENSIONS:
        return "image"
    elif file_ext in settings.ALLOWED_AUDIO_EXTENSIONS:
        return "audio"
    elif file_ext in settings.ALLOWED_PDF_EXTENSIONS:
        return "pdf"
    else:
        raise FileValidationException(f"Unsupported file type: {file_ext}")

