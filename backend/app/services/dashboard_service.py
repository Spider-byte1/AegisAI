from sqlalchemy.orm import Session
from app.models.scan_history import ScanHistory


def get_dashboard(db: Session):

    scans = db.query(ScanHistory).all()

    total_scans = len(scans)

    high = sum(1 for s in scans if s.risk_level == "High")
    critical = sum(1 for s in scans if s.risk_level == "Critical")
    medium = sum(1 for s in scans if s.risk_level == "Medium")
    low = sum(1 for s in scans if s.risk_level == "Low")

    avg_score = 0

    if total_scans:
        avg_score = sum(s.risk_score for s in scans) / total_scans

    return {
        "total_scans": total_scans,
        "average_risk_score": round(avg_score, 2),
        "risk_distribution": {
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low
        },
        "recent_scans": [
            {
                "target": s.target,
                "risk": s.risk_level,
                "score": s.risk_score,
                "time": s.created_at
            }
            for s in scans[-5:]
        ]
    }