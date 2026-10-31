from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.exceptions import AegisException
from app.core.logger import logger
from app.database.database import get_db
from app.models.scan import ACTIVE_STATUSES, Scan
from app.models.user import User
from app.scanners.validator import assert_scannable
from app.schemas.scanner import ScanRequest
from app.services.pdf_service import generate_pdf
from app.services.report_service import generate_report
from app.worker.tasks import run_scan_task

router = APIRouter(prefix="/scanner", tags=["Scanner"])


def _get_owned_scan(db: Session, scan_id: int, user: User) -> Scan:
    # 404 (not 403) for other people's scans so ids can't be probed.
    scan = db.query(Scan).filter(Scan.id == scan_id, Scan.user_id == user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.post("/start")
def start_scan_background(
    data: ScanRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not data.authorized:
        raise AegisException(
            "You must confirm you are authorised to scan this target",
            code="AUTHORIZATION_REQUIRED",
        )

    target = assert_scannable(data.target)  # syntax + DNS + private-range policy

    active = (
        db.query(Scan)
        .filter(Scan.user_id == user.id, Scan.status.in_(ACTIVE_STATUSES))
        .count()
    )
    if active >= settings.MAX_ACTIVE_SCANS_PER_USER:
        raise HTTPException(status_code=429, detail="Too many active scans; wait for one to finish")

    scan = Scan(user_id=user.id, target=target.host, status="queued", progress=0, message="Scan queued")
    db.add(scan)
    db.commit()
    db.refresh(scan)

    try:
        run_scan_task.delay(scan.id, target.host)
    except Exception:
        logger.exception("Could not queue scan (is Redis running?)")
        scan.status = "failed"
        scan.message = "Scan queue unavailable"
        db.commit()
        raise HTTPException(status_code=503, detail="Scan queue unavailable, try again later")

    logger.info(f"Scan queued: id={scan.id} user={user.id}")
    return {"scan_id": scan.id, "status": "started"}


@router.get("/status/{scan_id}")
def scan_status(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scan = _get_owned_scan(db, scan_id, user)
    return {
        "id": scan.id,
        "target": scan.target,
        "status": scan.status,
        "progress": scan.progress,
        "message": scan.message,
        "risk": scan.risk,
    }


@router.get("/result/{scan_id}")
def get_scan_result(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scan = _get_owned_scan(db, scan_id, user)
    return {
        "scan": {
            "id": scan.id,
            "target": scan.target,
            "status": scan.status,
            "risk": scan.risk,
            "progress": scan.progress,
            "message": scan.message,
            "details": scan.result,
        }
    }


@router.get("/report/{scan_id}")
def download_report(scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    scan = _get_owned_scan(db, scan_id, user)
    if scan.status != "completed" or not scan.result:
        raise HTTPException(status_code=404, detail="The report is not ready yet")

    # Rebuilt from the saved results each time, so older scans get the current layout and a
    # PDF that was deleted from disk (or lost with a container volume) is simply recreated.
    details = dict(scan.result)
    if scan.created_at and "scanned_at" not in details:
        details["scanned_at"] = scan.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")
    try:
        path = generate_pdf(generate_report(details), scan.id)
    except Exception:
        logger.exception(f"Could not build report for scan {scan.id}")
        raise HTTPException(status_code=500, detail="The report could not be generated")

    if scan.report_path != path:
        scan.report_path = path
        db.commit()
    return FileResponse(path, media_type="application/pdf", filename=f"aegisai_scan_{scan.id}.pdf")
