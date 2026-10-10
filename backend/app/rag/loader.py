"""Turn the markdown knowledge base into searchable chunks.

Each `knowledge/*.md` file is one document: a `# Title` followed by `## Section`
blocks. One section becomes one chunk (long sections are split on paragraph
boundaries). A generated "How AegisAI works" document is added so the assistant
can explain this app's own scoring without the text drifting out of sync.
"""
import re
from dataclasses import dataclass
from pathlib import Path

from app.rag.internal_docs import aegisai_overview_markdown

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"
MAX_CHUNK_WORDS = 220
INTERNAL_DOC = "how-aegisai-works"


@dataclass(frozen=True)
class Chunk:
    id: int
    doc: str  # file stem, e.g. "owasp-top-10"
    title: str  # document title
    section: str
    text: str
    internal: bool = False  # describes AegisAI itself rather than general security


def _split_long(text: str) -> list[str]:
    if len(text.split()) <= MAX_CHUNK_WORDS:
        return [text]
    parts, current = [], []
    for paragraph in re.split(r"\n\s*\n", text):
        candidate = current + [paragraph]
        if current and len(" ".join(candidate).split()) > MAX_CHUNK_WORDS:
            parts.append("\n\n".join(current))
            current = [paragraph]
        else:
            current = candidate
    if current:
        parts.append("\n\n".join(current))
    return parts


def parse_markdown(doc: str, markdown: str) -> list[tuple[str, str, str, str]]:
    """Return (doc, title, section, text) tuples for one document."""
    title = doc
    section = "Overview"
    buffer: list[str] = []
    out: list[tuple[str, str, str, str]] = []

    def flush():
        body = "\n".join(buffer).strip()
        if body:
            for piece in _split_long(body):
                out.append((doc, title, section, piece))
        buffer.clear()

    for line in markdown.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
        elif line.startswith("## "):
            flush()
            section = line[3:].strip()
        else:
            buffer.append(line)
    flush()
    return out


def load_chunks(directory: Path = KNOWLEDGE_DIR) -> list[Chunk]:
    raw: list[tuple[str, str, str, str]] = []
    for path in sorted(directory.glob("*.md")):
        raw.extend(parse_markdown(path.stem, path.read_text(encoding="utf-8")))
    raw.extend(parse_markdown(INTERNAL_DOC, aegisai_overview_markdown()))
    return [Chunk(i + 1, d, t, s, x, internal=(d == INTERNAL_DOC)) for i, (d, t, s, x) in enumerate(raw)]
