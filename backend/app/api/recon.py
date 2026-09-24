from fastapi import APIRouter
from app.schemas.recon import ReconRequest
from app.services.recon_service import run_recon

router = APIRouter(
    prefix="/recon",
    tags=["Recon"]
)

@router.post("/scan")
def scan(data: ReconRequest):
    return run_recon(data.target)