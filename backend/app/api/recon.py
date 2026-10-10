from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.recon import ReconRequest
from app.services.recon_service import run_recon

router = APIRouter(prefix="/recon", tags=["Recon"])


@router.post("/scan")
def scan(data: ReconRequest, user: User = Depends(get_current_user)):
    return run_recon(data.target)
