# Build context is the REPO ROOT (requirements.txt lives there):
#   docker build -f backend/Dockerfile .      (docker-compose.yml does this for you)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# nmap is a real dependency of the scan pipeline, not just a Python package.
RUN apt-get update \
 && apt-get install -y --no-install-recommends nmap \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY backend/ .

# Run as an unprivileged user. Nmap then uses TCP-connect scans, which is all
# the -sV service detection needs. /app/logs and /app/app/reports must be writable.
RUN useradd --create-home --uid 10001 aegis \
 && mkdir -p /app/logs /app/app/reports \
 && chown -R aegis:aegis /app
USER aegis

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
