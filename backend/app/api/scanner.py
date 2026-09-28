from fastapi import APIRouter, HTTPException
from app.schemas.scanner import ScanRequest
from app.services.scanner_service import start_scan

router = APIRouter(
    prefix="/scanner",
    tags=["Scanner"]
)

@router.post("/scan")
def scan(data: ScanRequest):
    try:
        result = start_scan(data.target)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    