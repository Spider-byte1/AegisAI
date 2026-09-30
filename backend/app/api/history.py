from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session


from app.database.database import get_db
from app.models.scan import Scan
from app.database import SessionLocal
from app.services.history_service import get_history
from app.schemas.scanner import ScanResponse

router = APIRouter(
    prefix="/history",
    tags=["History"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/")
def get_history(db: Session = Depends(get_db)):

    scans = db.query(Scan).order_by(
        Scan.id.desc()
    ).all()

    result = []

    for scan in scans:
        result.append({
            "id": scan.id,
            "target": scan.target,
            "status": scan.status,
            "risk": eval(scan.risk)["level"]
        })

    return result