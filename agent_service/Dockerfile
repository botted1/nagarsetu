FROM python:3.12-slim

# Avoid writing .pyc files; flush stdout/stderr immediately so Cloud Run
# captures logs in real time.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install system deps that some Python wheels need (httpx, cryptography fallbacks).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps (cached layer)
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Application code
COPY . .

# Cloud Run sets $PORT (defaults to 8080); fall back to 8001 for local docker-run.
ENV PORT=8080
EXPOSE 8080

# `--proxy-headers` is needed because Cloud Run terminates TLS at the front door.
CMD exec uvicorn main:app \
    --host 0.0.0.0 \
    --port "${PORT}" \
    --proxy-headers \
    --forwarded-allow-ips='*'
