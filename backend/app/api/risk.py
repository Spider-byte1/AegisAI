from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.risk import RiskRequest
from app.services.risk_engine import calculate_risk

router = APIRouter(prefix="/risk", tags=["Risk"])


@router.post("/")
def analyze(request: RiskRequest, user: User = Depends(get_current_user)):
    ports = [p.model_dump() for p in request.ports]
    vulns = [v.model_dump() for v in request.vulnerabilities]
    return calculate_risk(ports, vulns)
