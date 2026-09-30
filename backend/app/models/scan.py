from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database.database import Base

class Scan(Base):
    
    __tablename__ = "scans"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    target = Column(
        String,
        nullable=False
    )

    risk = Column(
        String,
        nullable=True
    )

    status = Column(
        String,
        nullable=False
    )