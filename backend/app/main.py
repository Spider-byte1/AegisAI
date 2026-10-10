from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.models  # noqa: F401  (registers tables on Base.metadata)
from app.api import assistant, auth, dashboard, history, profile, recon, risk, scanner
from app.core.config import settings
from app.core.error_handler import aegis_exception_handler, general_exception_handler
from app.core.exceptions import AegisException
from app.database import Base, engine


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Dev convenience. For real schema changes use Alembic migrations.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.APP_NAME, version="1.2.0", lifespan=lifespan)

app.add_exception_handler(AegisException, aegis_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

for module in (auth, recon, scanner, dashboard, profile, risk, history, assistant):
    app.include_router(module.router)


@app.get("/")
def root():
    return {"message": "Welcome to AegisAI"}


@app.get("/health")
def health():
    return {"status": "healthy"}
