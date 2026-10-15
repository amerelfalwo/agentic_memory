# Multi-stage Dockerfile for Agentic Memory FastAPI Backend
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

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH=/root/.local/bin:$PATH \
    PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local

# Copy application code and assets
COPY backend /app/backend
COPY langgraph /app/langgraph
COPY CoALA_Paper.pdf /app/CoALA_Paper.pdf
COPY pyproject.toml /app/pyproject.toml

EXPOSE 8000

# Respect Render's dynamic $PORT environment variable
CMD ["sh", "-c", "exec uvicorn backend.app.presentation.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
