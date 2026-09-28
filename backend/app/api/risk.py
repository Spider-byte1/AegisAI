from fastapi import APIRouter
from app.schemas.risk import RiskRequest
from app.services.risk_engine import calculate_risk

router = APIRouter(prefix="/risk", tags=["Risk"])

@router.post("/")
def analyze(request: RiskRequest):
    return calculate_risk(
        request.ports,
        request.vulnerabilities
    )