from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.database.database import Base

class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    target = Column(String(255), nullable=False)
    status = Column(String(30), default="Completed")
    scan_type = Column(String(50), default="Nmap")
    results = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())