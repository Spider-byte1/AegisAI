from fastapi import APIRouter

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/stats")
def dashboard_stats():
    return {
        "total_users": 1,
        "total_assets": 0,
        "total_scans": 0,
        "critical_vulnerabilities": 0,
        "system_status": "Healthy"
    }