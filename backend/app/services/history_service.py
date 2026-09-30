from sqlalchemy.orm import Session
from app.models.scan_history import ScanHistory


def save_scan(db: Session, target, risk, status):

    scan = ScanHistory(
        target=target,
        risk_level=risk["level"],
        risk_score=risk["score"],
        status=status
    )

    db.add(scan)
    db.commit()
    db.refresh(scan)

    return scan


def get_history(db: Session):

    return db.query(ScanHistory).order_by(
        ScanHistory.created_at.desc()
    ).all()