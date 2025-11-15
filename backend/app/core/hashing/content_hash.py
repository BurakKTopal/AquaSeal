"""Content hashing utilities"""
import hashlib
from typing import BinaryIO


def compute_file_hash(file: BinaryIO, algorithm: str = "sha256") -> str:
    """Compute hash of file content"""
    hash_obj = hashlib.new(algorithm)
    file.seek(0)
    while chunk := file.read(8192):
        hash_obj.update(chunk)
    file.seek(0)
    return hash_obj.hexdigest()


def compute_string_hash(content: str, algorithm: str = "sha256") -> str:
    """Compute hash of string content"""
    hash_obj = hashlib.new(algorithm)
    hash_obj.update(content.encode('utf-8'))
    return hash_obj.hexdigest()

