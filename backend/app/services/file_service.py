"""File handling utilities"""
import os
import uuid
from pathlib import Path
from typing import BinaryIO, Tuple
from fastapi import UploadFile

from app.config import settings


def save_uploaded_file(file: UploadFile, upload_dir: str = None) -> Tuple[str, str]:
    """
    Save uploaded file to disk
    
    Returns:
        Tuple of (file_path, filename)
    """
    if upload_dir is None:
        upload_dir = settings.UPLOAD_DIR
    
    # Create upload directory if it doesn't exist
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)
    
    return file_path, unique_filename


def read_file(file_path: str) -> bytes:
    """Read file content as bytes"""
    with open(file_path, "rb") as f:
        return f.read()


def delete_file(file_path: str) -> None:
    """Delete file from disk"""
    if os.path.exists(file_path):
        os.remove(file_path)

