from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HistoryItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    # Earlier turns of this conversation, oldest first (the server keeps the last few).
    history: list[HistoryItem] = Field(default_factory=list, max_length=20)


class SourceOut(BaseModel):
    id: int
    title: str
    section: str
    excerpt: str
    cited: bool


class AskResponse(BaseModel):
    answer: str
    mode: Literal["llm", "retrieval_only", "no_context"]
    sources: list[SourceOut]
    notice: str | None = None


class ChatLogOut(BaseModel):
    id: int
    question: str
    answer: str
    mode: str
    sources: list[SourceOut]
    created_at: datetime
