from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.schemas.scanner import ScanRequest
from app.services.scanner_service import start_scan
from app.database.database import get_db


router = APIRouter(
    prefix="/scanner",
    tags=["Scanner"]
)


@router.post("/scan")
def scan(
    data: ScanRequest,
    db: Session = Depends(get_db)
):

    try:
        print("TARGET RECEIVED:", data.target)

        result = start_scan(
            db,
            data.target
        )

        print("SCAN RESULT:", result)

        return result

    except Exception as e:

        print("ERROR:", e)

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )