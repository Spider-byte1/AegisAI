from app.core.exceptions import AegisException
from app.core.logger import logger
from app.database.database import SessionLocal
from app.models.scan import Scan
from app.services.scanner_service import start_scan
from app.worker.celery_app import celery_app


@celery_app.task(name="app.worker.tasks.run_scan_task")
def run_scan_task(scan_id: int, target: str):
    db = SessionLocal()
    scan = None

    def update(status=None, progress=None, message=None):
        if status is not None:
            scan.status = status
        if progress is not None:
            scan.progress = progress
        if message is not None:
            scan.message = message
        db.commit()

    try:
        scan = db.get(Scan, scan_id)
        if scan is None:
            logger.warning(f"Scan {scan_id} no longer exists; skipping")
            return

        update("running", 10, "Scan started")
        logger.info(f"Celery scan started: id={scan_id}")

        outcome = start_scan(
            target,
            scan_id,
            on_progress=lambda pct, msg: update(progress=pct, message=msg),
        )

        scan.risk_score = outcome["risk"]["score"]
        scan.risk_level = outcome["risk"]["level"]
        scan.result = outcome["details"]
        scan.report_path = outcome["pdf"]
        update("completed", 100, "Scan completed")
        logger.info(f"Celery scan completed: id={scan_id}")

    except Exception as exc:
        db.rollback()
        logger.exception(f"Celery scan failed: id={scan_id}")
        if scan is not None:
            # Short, safe message for the UI; the full traceback is in the log.
            reason = exc.message if isinstance(exc, AegisException) else exc.__class__.__name__
            scan.status = "failed"
            scan.message = f"Scan failed: {reason}"[:255]
            db.commit()
    finally:
        db.close()
