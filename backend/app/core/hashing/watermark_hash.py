"""Watermark hash generation"""
import hashlib
import json
from typing import Dict, Any

from app.models.schemas import WatermarkPayload


def generate_watermark_hash(payload: WatermarkPayload) -> str:
    """
    Generate deterministic hash from watermark payload.
    
    Note: content_hash is excluded from hash calculation to ensure
    the watermark hash remains stable even if the image is slightly
    modified (e.g., drawing, cropping, compression). The watermark
    itself is embedded in the content, so content_hash doesn't need
    to be part of the hash for security purposes.
    """
    # Create hash from stable fields only (exclude content_hash)
    # This ensures the hash remains the same even if image is modified
    hash_data = {
        "user_id": payload.user_id,
        "timestamp": payload.timestamp,
        "metadata_hash": payload.metadata_hash,
        "license": payload.license,
    }
    # Sort keys to ensure deterministic ordering
    hash_str = json.dumps(hash_data, sort_keys=True)
    
    # Generate SHA-256 hash
    hash_obj = hashlib.sha256()
    hash_obj.update(hash_str.encode('utf-8'))
    return hash_obj.hexdigest()


def create_watermark_payload(
    user_id: str,
    timestamp: int,
    metadata_hash: str,
    content_hash: str,
    license: str
) -> WatermarkPayload:
    """Create watermark payload"""
    return WatermarkPayload(
        user_id=user_id,
        timestamp=timestamp,
        metadata_hash=metadata_hash,
        content_hash=content_hash,
        license=license
    )

