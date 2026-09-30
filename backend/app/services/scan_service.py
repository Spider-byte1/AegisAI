from sqlalchemy.orm import Session
from app.models.scan import Scan


def save_scan(
    db: Session,
    target: str,
    risk,
    status: str
):

    scan = Scan(
        target=target,
        risk=str(risk),
        status=status
    )

    db.add(scan)
    db.commit()
    db.refresh(scan)

    return scan