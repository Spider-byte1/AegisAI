from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.database import get_db
from app.models.scan import Scan
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total = db.query(Scan).filter(Scan.user_id == user.id).count()
    by_level = dict(
        db.query(Scan.risk_level, func.count(Scan.id))
        .filter(Scan.user_id == user.id, Scan.risk_level.isnot(None))
        .group_by(Scan.risk_level)
        .all()
    )
    critical = by_level.get("CRITICAL", 0)
    return {
        "total_scans": total,
        "critical_risk": critical,
        # The dashboard has no separate "critical" card, so it counts under High.
        "high_risk": by_level.get("HIGH", 0) + critical,
        "medium_risk": by_level.get("MEDIUM", 0),
        "low_risk": by_level.get("LOW", 0),
    }
