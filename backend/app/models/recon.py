from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base

class Recon(Base):
    __tablename__ = "recon"

    id = Column(Integer, primary_key=True, index=True)
    target = Column(String, nullable=False)
    ip = Column(String)
    status = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())