from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    target = Column(String, nullable=False)
    risk_level = Column(String)
    risk_score = Column(Integer)
    status = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)