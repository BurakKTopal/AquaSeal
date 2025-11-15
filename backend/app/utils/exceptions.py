"""Custom exceptions for the application"""


class WatermarkingException(Exception):
    """Base exception for watermarking errors"""
    pass


class FileValidationException(Exception):
    """Exception for file validation errors"""
    pass


class CAMPIntegrationException(Exception):
    """Exception for CAMP network integration errors"""
    pass


class WatermarkExtractionException(Exception):
    """Exception for watermark extraction errors"""
    pass

