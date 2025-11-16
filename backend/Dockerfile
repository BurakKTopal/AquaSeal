# Multi-stage build optimized for Railway (8GB limit)
# Stage 1: Build stage with build dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .

# CRITICAL: Prevent CUDA packages from being installed (saves 300-500MB)
ENV NUMBA_DISABLE_CUDA=1 \
    NUMBA_DISABLE_JIT=0 \
    PIP_NO_CUDA=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install Python packages and clean up immediately
RUN pip install --no-cache-dir --user -r requirements.txt && \
    # Remove Python cache files
    find /root/.local -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true && \
    find /root/.local -type f -name "*.pyc" -delete && \
    find /root/.local -type f -name "*.pyo" -delete && \
    # Remove test files and documentation
    find /root/.local -type d -name "tests" -exec rm -r {} + 2>/dev/null || true && \
    find /root/.local -type d -name "test" -exec rm -r {} + 2>/dev/null || true && \
    find /root/.local -type d -name "*.egg-info" -exec rm -r {} + 2>/dev/null || true && \
    find /root/.local -type f -name "*.txt" -path "*/test*" -delete 2>/dev/null || true && \
    find /root/.local -type f -name "*.md" -delete 2>/dev/null || true && \
    find /root/.local -type f -name "*.rst" -delete 2>/dev/null || true && \
    # Remove any CUDA-related packages that might have been installed
    pip uninstall -y $(pip list | grep -i cuda | awk '{print $1}') 2>/dev/null || true && \
    # Clean pip cache
    pip cache purge 2>/dev/null || true

# Stage 2: Runtime stage - minimal image
FROM python:3.11-slim

WORKDIR /app

# Install only runtime system dependencies (no build tools)
# Note: No audio libraries needed - only MP3 metadata watermarking (mutagen) is used
# Mutagen is pure Python and doesn't require system libraries
RUN apt-get update && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    rm -rf /tmp/* /var/tmp/*

# Copy Python packages from builder stage
COPY --from=builder /root/.local /root/.local

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONHASHSEED=random

# Copy application code
COPY app/ ./app/

# Create upload directory
RUN mkdir -p ./uploads

# Expose port
EXPOSE 8000

# Health check for Railway (uses PORT env var, checks /health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD sh -c "python -c \"import urllib.request,os; port=os.getenv('PORT','8000'); urllib.request.urlopen(f'http://localhost:{port}/health', timeout=5)\"" || exit 1

# Run application
# Railway sets PORT environment variable dynamically
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"

