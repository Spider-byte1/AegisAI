import json
from datetime import datetime, timedelta, timezone

import anyio

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.logger import logger
from app.database.database import SessionLocal, get_db
from app.models.chat import ChatLog
from app.models.user import User
from app.rag.service import answer_question, stream_answer
from app.schemas.assistant import AskRequest, AskResponse, ChatLogOut

router = APIRouter(prefix="/assistant", tags=["Assistant"])


def _enforce_rate_limit(db: Session, user: User) -> None:
    # Per-user hourly cap; counted in the database so it holds across workers.
    window_start = datetime.now(timezone.utc) - timedelta(hours=1)
    recent = db.query(ChatLog).filter(ChatLog.user_id == user.id, ChatLog.created_at >= window_start).count()
    if recent >= settings.RAG_MAX_QUESTIONS_PER_HOUR:
        raise HTTPException(status_code=429, detail="Question limit reached for this hour; please try again later")


@router.post("/ask", response_model=AskResponse)
def ask(
    data: AskRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _enforce_rate_limit(db, user)
    result = answer_question(data.question.strip(), [h.model_dump() for h in data.history])

    db.add(
        ChatLog(
            user_id=user.id,
            question=data.question.strip(),
            answer=result.answer,
            mode=result.mode,
            sources=result.sources,
        )
    )
    db.commit()

    return AskResponse(answer=result.answer, mode=result.mode, sources=result.sources, notice=result.notice)


def _save_chat(user_id: int, question: str, answer: str, mode: str, sources: list) -> None:
    # A fresh session: the request-scoped one may already be closed while a response streams.
    db = SessionLocal()
    try:
        db.add(ChatLog(user_id=user_id, question=question, answer=answer, mode=mode, sources=sources))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Could not save chat log")
    finally:
        db.close()


_DONE = object()


async def _stream_events(user_id: int, question: str, history: list[dict]):
    """NDJSON lines for one streamed answer.

    The model call is a blocking iterator, so each step runs in a worker thread.
    The `finally` block closes that iterator (which closes the connection to the
    model, so it stops generating and billing) and saves the conversation. It runs
    when the answer finishes AND when the client disconnects.
    """
    iterator = stream_answer(question, history)
    pieces: list[str] = []
    final: dict | None = None
    try:
        while True:
            event = await anyio.to_thread.run_sync(next, iterator, _DONE)
            if event is _DONE:
                break
            if event["type"] == "delta":
                pieces.append(event["text"])
            elif event["type"] == "done":
                final = event
            yield json.dumps(event) + "\n"
    except Exception:
        logger.exception("Streaming answer failed")
        yield json.dumps({"type": "error", "message": "Something went wrong"}) + "\n"
    finally:
        with anyio.CancelScope(shield=True):  # must finish even if the request was cancelled
            await anyio.to_thread.run_sync(iterator.close)
            if final is not None:
                await anyio.to_thread.run_sync(
                    _save_chat, user_id, question, final["answer"], final["mode"], final["sources"]
                )
            elif pieces:  # stopped or interrupted: keep what the user saw
                await anyio.to_thread.run_sync(_save_chat, user_id, question, "".join(pieces), "llm", [])


class ClosingStreamingResponse(StreamingResponse):
    """StreamingResponse that always closes its body generator when the response ends.

    Starlette abandons the generator when a client disconnects, and Python would only
    close it whenever the garbage collector gets around to it (seconds later). Closing
    it here makes cleanup immediate and deterministic.
    """

    async def __call__(self, scope, receive, send):
        try:
            await super().__call__(scope, receive, send)
        finally:
            with anyio.CancelScope(shield=True):
                aclose = getattr(self.body_iterator, "aclose", None)
                if aclose is not None:
                    await aclose()


@router.post("/ask/stream")
def ask_stream(
    data: AskRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Streams the answer as newline-delimited JSON events (delta ... done | error)."""
    _enforce_rate_limit(db, user)  # fails with 429 before any streaming starts

    return ClosingStreamingResponse(
        _stream_events(user.id, data.question.strip(), [h.model_dump() for h in data.history]),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},  # keep proxies from buffering
    )


@router.get("/history", response_model=list[ChatLogOut])
def history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(ChatLog)
        .filter(ChatLog.user_id == user.id)
        .order_by(ChatLog.id.desc())
        .limit(limit)
        .all()
    )
    return [
        ChatLogOut(
            id=r.id, question=r.question, answer=r.answer, mode=r.mode,
            sources=r.sources or [], created_at=r.created_at,
        )
        for r in reversed(rows)  # oldest first, ready to display
    ]


@router.delete("/history")
def clear_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    deleted = db.query(ChatLog).filter(ChatLog.user_id == user.id).delete()
    db.commit()
    return {"deleted": deleted}
