import re
from dataclasses import dataclass, field
from typing import Iterator

from app.core.config import settings
from app.core.logger import logger
from app.rag.llm import LLMUnavailable, get_llm_client
from app.rag.prompt import MAX_HISTORY_TURNS, build_messages, build_system_prompt
from app.rag.retriever import Hit, get_retriever, tokenize

NO_CONTEXT_ANSWER = (
    "I couldn't find anything about that in my cybersecurity knowledge base, and AI answers are not "
    "switched on (no API key is configured), so I can only search the built-in notes. "
    "Try topics like OWASP and web vulnerabilities, ports and Nmap, CVEs and CVSS, phishing, SOC work, "
    "incident response, MITRE ATT&CK, logs, passwords and TLS, or how AegisAI scores risk."
)
UNAVAILABLE_ANSWER = "The AI service is temporarily unavailable. Please try again in a moment."

_CITATION = re.compile(r"\[(\d+)\]")
_EXCERPT_CHARS = 280


@dataclass
class Answer:
    answer: str
    mode: str  # llm | retrieval_only | no_context
    sources: list[dict] = field(default_factory=list)
    notice: str | None = None


def _retrieval_query(question: str, history: list[dict]) -> str:
    """Short follow-ups ("what about its defences?") borrow the previous question's keywords."""
    if len(tokenize(question)) < 3:
        previous = [h["content"] for h in history if h["role"] == "user"]
        if previous:
            return f"{previous[-1]} {question}"
    return question


def _excerpt(text: str) -> str:
    flat = " ".join(text.split())
    return flat if len(flat) <= _EXCERPT_CHARS else flat[: _EXCERPT_CHARS - 1].rstrip() + "…"


def _sources(hits: list[Hit], answer: str | None) -> list[dict]:
    cited = {int(n) for n in _CITATION.findall(answer or "")}
    return [
        {
            "id": n,
            "title": h.chunk.title,
            "section": h.chunk.section,
            "excerpt": _excerpt(h.chunk.text),
            "cited": n in cited,
        }
        for n, h in enumerate(hits, start=1)
    ]


def _passages_answer(hits: list[Hit]) -> str:
    lines = ["Here are the most relevant passages from the knowledge base:"]
    for n, hit in enumerate(hits[:3], start=1):
        lines.append(f"\n[{n}] {hit.chunk.title} - {hit.chunk.section}\n{hit.chunk.text}")
    return "\n".join(lines)


def _find_hits(question: str, history: list[dict]) -> list[Hit]:
    # The relevance gate now only decides whether reference notes are attached to the
    # prompt. It no longer blocks the question: the model answers from its own knowledge too.
    return get_retriever().search(
        _retrieval_query(question, history),
        k=settings.RAG_TOP_K,
        min_score=settings.RAG_MIN_SCORE,
        min_coverage=settings.RAG_MIN_COVERAGE,
    )


def _without_ai(hits: list[Hit], notice: str | None = None) -> Answer:
    """What the user gets when no model is available: matching passages, or a polite 'nothing found'."""
    if not hits:
        return Answer(UNAVAILABLE_ANSWER if notice else NO_CONTEXT_ANSWER, "no_context")
    passages = _passages_answer(hits)
    return Answer(
        passages,
        "retrieval_only",
        _sources(hits, passages),
        notice=notice or "AI answer generation is not configured, so relevant knowledge-base passages are shown instead.",
    )


_UNAVAILABLE_NOTICE = "The AI service is temporarily unavailable, so knowledge-base passages are shown instead."


def answer_question(question: str, history: list[dict]) -> Answer:
    """One-shot (non-streaming) answer."""
    history = history[-MAX_HISTORY_TURNS:]
    hits = _find_hits(question, history)

    llm = get_llm_client()
    if llm is None:
        return _without_ai(hits)

    try:
        text = llm.complete(build_system_prompt(), build_messages(question, history, hits), settings.LLM_MAX_TOKENS)
    except LLMUnavailable as exc:
        logger.warning(f"Falling back to a no-AI answer ({exc})")
        return _without_ai(hits, notice=_UNAVAILABLE_NOTICE)

    return Answer(text, "llm", _sources(hits, text))


def stream_answer(question: str, history: list[dict]) -> Iterator[dict]:
    """Events for a streaming answer: {"type": "delta", "text"} ... then {"type": "done", ...}
    or {"type": "error", "message"} if the model fails part-way through."""
    history = history[-MAX_HISTORY_TURNS:]
    hits = _find_hits(question, history)

    def done(a: Answer) -> dict:
        return {"type": "done", "answer": a.answer, "mode": a.mode, "sources": a.sources, "notice": a.notice}

    llm = get_llm_client()
    if llm is None:
        fallback = _without_ai(hits)
        yield {"type": "delta", "text": fallback.answer}
        yield done(fallback)
        return

    parts: list[str] = []
    try:
        for piece in llm.stream(build_system_prompt(), build_messages(question, history, hits), settings.LLM_MAX_TOKENS):
            parts.append(piece)
            yield {"type": "delta", "text": piece}
    except LLMUnavailable as exc:
        if parts:  # cut off after the user already saw part of the answer
            logger.warning(f"Stream interrupted after {len(parts)} pieces ({exc})")
            yield {"type": "error", "message": "The response was interrupted."}
            return
        logger.warning(f"Stream failed before the first token ({exc})")
        fallback = _without_ai(hits, notice=_UNAVAILABLE_NOTICE)
        yield {"type": "delta", "text": fallback.answer}
        yield done(fallback)
        return

    text = "".join(parts)
    yield done(Answer(text, "llm", _sources(hits, text)))
