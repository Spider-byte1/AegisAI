from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text

from app.database.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ChatLog(Base):
    """One question/answer exchange with the security assistant."""

    __tablename__ = "chat_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    mode = Column(String(20), nullable=False)  # llm | retrieval_only | no_context
    sources = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False, index=True)
