# Multi-stage Dockerfile for Mnemos Cognitive Memory FastAPI Backend (Hugging Face Spaces & Cloud Compatible)
FROM python:3.11-slim AS builder

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-warn-script-location -r requirements.txt

# Final runtime image
FROM python:3.11-slim AS runner

# Create non-root user with UID 1000 required by Hugging Face Spaces
RUN useradd -m -u 1000 user

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONPATH=/app \
    PORT=7860

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed python dependencies into user home
COPY --chown=user:user --from=builder /root/.local /home/user/.local

# Copy application code and assets with user ownership
COPY --chown=user:user backend /app/backend
COPY --chown=user:user langgraph /app/langgraph
COPY --chown=user:user CoALA_Paper.pdf /app/CoALA_Paper.pdf
COPY --chown=user:user pyproject.toml /app/pyproject.toml

# Switch to non-root user
USER user

# Hugging Face Spaces standard port is 7860
EXPOSE 7860

# Respect dynamic $PORT environment variable, defaulting to 7860 for Hugging Face Spaces
CMD ["sh", "-c", "exec uvicorn backend.app.presentation.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
