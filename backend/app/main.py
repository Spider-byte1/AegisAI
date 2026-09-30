from fastapi import FastAPI

from app.api import auth
from app.api import dashboard
from app.api import profile
from app.api import recon
from app.api import scanner
from app.api import risk
from app.api import history
from fastapi.middleware.cors import CORSMiddleware

import app.models.user
import app.models.scan
import app.models.recon



from app.database import Engine, Base


app = FastAPI(
    title="AegisAI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create database tables
Base.metadata.create_all(bind=Engine)


# API Routes
app.include_router(recon.router)
app.include_router(scanner.router)
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(profile.router)
app.include_router(risk.router)
app.include_router(history.router)


@app.get("/")

def root():
    return {
        "message": "Welcome to AegisAI"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
