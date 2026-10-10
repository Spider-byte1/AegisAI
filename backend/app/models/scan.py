from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.database import Base

ACTIVE_STATUSES = ("queued", "running")


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target = Column(String(253), nullable=False)
    status = Column(String(20), nullable=False, default="queued")
    progress = Column(Integer, nullable=False, default=0)
    message = Column(String(255), default="Queued")

    # Risk is stored as real columns instead of a stringified dict.
    risk_score = Column(Integer)
    risk_level = Column(String(10))

    # Full findings (ports, services, CVEs, WHOIS/DNS/SSL) as JSON.
    result = Column(JSON)
    report_path = Column(String(512))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="scans")

    @property
    def risk(self) -> dict | None:
        if self.risk_level is None:
            return None
        return {"score": self.risk_score, "level": self.risk_level}
