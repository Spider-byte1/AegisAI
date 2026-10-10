import os

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def _list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


class Settings:
    APP_NAME = os.getenv("APP_NAME", "AegisAI")
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    DATABASE_URL = os.getenv("DATABASE_URL")

    # Auth
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Scanning policy
    # Leave False in production: stops users from pointing the scanner at
    # localhost / internal networks. Set True only for a local lab.
    ALLOW_PRIVATE_TARGETS = _bool("ALLOW_PRIVATE_TARGETS", False)
    MAX_ACTIVE_SCANS_PER_USER = int(os.getenv("MAX_ACTIVE_SCANS_PER_USER", "3"))
    NMAP_TIMEOUT_SECONDS = int(os.getenv("NMAP_TIMEOUT_SECONDS", "600"))

    # Security assistant (RAG)
    # Without an API key the assistant still works, but returns knowledge-base
    # passages instead of a generated answer.
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
    LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "1500"))
    LLM_TIMEOUT_SECONDS = float(os.getenv("LLM_TIMEOUT_SECONDS", "60"))
    # "cybersecurity": chat freely about security/IT topics and politely decline unrelated ones.
    # "general": answer any topic (costs more and lets users treat it as a general chatbot).
    ASSISTANT_SCOPE = os.getenv("ASSISTANT_SCOPE", "cybersecurity").strip().lower()
    RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
    # Relevance gate: the best passage must score at least this much AND contain
    # at least this share of the question's keywords, or the question is treated
    # as "not covered" and no (paid) model call is made.
    RAG_MIN_SCORE = float(os.getenv("RAG_MIN_SCORE", "3.0"))
    RAG_MIN_COVERAGE = float(os.getenv("RAG_MIN_COVERAGE", "0.5"))
    RAG_MAX_QUESTIONS_PER_HOUR = int(os.getenv("RAG_MAX_QUESTIONS_PER_HOUR", "30"))

    # Infra
    CORS_ORIGINS = _list("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

    def validate(self) -> None:
        if not self.DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set (see backend/.env.example)")
        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32 or "change_this" in self.SECRET_KEY:
            raise RuntimeError(
                "SECRET_KEY is missing, too short (<32 chars) or still a placeholder. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )


settings = Settings()
settings.validate()
