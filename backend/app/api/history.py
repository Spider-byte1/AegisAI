from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.database import get_db
from app.models.scan import Scan
from app.models.user import User

router = APIRouter(prefix="/history", tags=["History"])


@router.get("/")
def get_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scans = db.query(Scan).filter(Scan.user_id == user.id).order_by(Scan.id.desc()).all()
    return [
        {
            "id": s.id,
            "target": s.target,
            "status": s.status,
            "risk": s.risk_level or "UNKNOWN",
            "risk_score": s.risk_score,
            "progress": s.progress,
            "message": s.message,
            "created_at": s.created_at,
        }
        for s in scans
    ]


@router.delete("/{scan_id}")
def delete_scan(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    if scan.report_path:
        Path(scan.report_path).unlink(missing_ok=True)

    db.delete(scan)
    db.commit()
    return {"message": "Scan deleted successfully"}
