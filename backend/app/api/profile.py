from fastapi import APIRouter

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)

@router.get("/")
def profile():
    return {
        "username": "admin",
        "role": "Administrator",
        "status": "Active"
    }