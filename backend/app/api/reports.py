from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.config import settings
from app.database.database import get_db
from app.models.scan import Scan
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/download/{filename}")
def download_report(filename: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Look the file up through the DB (ownership check + no path traversal).
    scan = db.query(Scan).filter(Scan.report_file == filename, Scan.user_id == user.id).first()
    path = settings.REPORTS_DIR / filename if scan else None
    if not scan or not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    return FileResponse(path, media_type="application/pdf", filename=filename)
