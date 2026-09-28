from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models import User


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register")
def register(
    username: str,
    email: str,
    password: str,
    db: Session = Depends(get_db)
):

    # Check if user already exists
    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    # Create new user
    new_user = User(
        username=username,
        email=email,
        password=password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)


    return {
        "message": "User registered successfully",
        "username": new_user.username
    }