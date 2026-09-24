from fastapi import APIRouter
from app.schemas.scanner import ScanRequest
from app.services.scanner_service import start_scan

router = APIRouter(
    prefix="/scanner",
    tags=["Scanner"]
)

@router.post("/scan")
def scan(data: ScanRequest):
    return start_scan(data.target)