from fastapi import FastAPI

from app.api import auth
from app.api import dashboard
from app.api import profile
from app.api import recon
from app.api import scanner



app = FastAPI(
    title="AegisAI",
    version="1.0.0"
)
app.include_router(recon.router)
app.include_router(scanner.router)
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(profile.router)

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
