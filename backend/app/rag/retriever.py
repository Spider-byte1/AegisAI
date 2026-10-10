"""A small, dependency-free BM25 retriever.

BM25 is a classic keyword-ranking function. It runs instantly, needs no model
download and is easy to explain. `Retriever` is the seam where an embedding or
vector-database search could be swapped in later without touching the rest of
the assistant.
"""
import math
import re
from collections import Counter
from dataclasses import dataclass

from app.rag.loader import Chunk, load_chunks

_TOKEN = re.compile(r"[a-z0-9]+")

_STOPWORDS = frozenset(
    """a an and are as at be been being but by can could did do does doing for from had has have how i if in
    into is it its me my of on or our should so some than that the their them then there these they this to
    us was we were what when where which who whom why will with would you your about also any more most
    other such very explain describe tell give show please help know using use used uses work works way ways
    example examples difference differences between mean means meaning like make made get gets""".split()
)

# Passages about AegisAI itself only compete at full strength when the question
# is clearly about this app; otherwise generic questions ("why is Telnet risky?")
# would be hijacked by AegisAI's own scoring text, which shares words like "risk".
_INTERNAL_TRIGGERS = frozenset({"aegisai", "aegis", "platform", "tool", "app"})
_INTERNAL_DISCOUNT = 0.6

# Everyday phrasing -> the vocabulary the knowledge base uses.
_SYNONYMS = {
    "hacker": "attacker", "hackers": "attacker", "hacking": "attack", "hacked": "attack",
    "virus": "malware", "viruses": "malware", "trojans": "trojan",
    "sqli": "sql injection", "xss": "cross site scripting", "csrf": "cross site request forgery",
    "ssrf": "server side request forgery", "idor": "insecure direct object reference",
    "mfa": "multi factor authentication", "2fa": "multi factor authentication",
    "pentest": "penetration testing", "vuln": "vulnerability", "vulns": "vulnerability",
    "ddos": "denial of service", "dos": "denial of service", "ir": "incident response",
    "pwd": "password", "passwords": "password", "pw": "password",
    "ransom": "ransomware", "patching": "patch", "patches": "patch",
    "encrypt": "encryption", "encrypted": "encryption", "ssl": "tls",
    "ports": "port", "firewalls": "firewall", "logs": "log", "logging": "log",
}


def _undouble(token: str) -> str:
    """scann -> scan, logg -> log (but keep 'ss', 'll' and vowel pairs)."""
    if len(token) > 3 and token[-1] == token[-2] and token[-1] not in "aeiouls":
        return token[:-1]
    return token


def _stem(token: str) -> str:
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 5 and token.endswith("ing"):
        return _undouble(token[:-3])
    if len(token) > 4 and token.endswith("ed"):
        return _undouble(token[:-2])
    if len(token) > 3 and token.endswith("s") and not token.endswith(("ss", "us", "is")):
        return token[:-1]
    return token


def tokenize(text: str, expand: bool = False) -> list[str]:
    raw = _TOKEN.findall(text.lower())
    if expand:
        extra = []
        for t in raw:
            if t in _SYNONYMS:
                extra.extend(_TOKEN.findall(_SYNONYMS[t]))
        raw = raw + extra
    return [_stem(t) for t in raw if t not in _STOPWORDS and len(t) > 1]


@dataclass(frozen=True)
class Hit:
    chunk: Chunk
    score: float
    coverage: float  # share of distinct query terms found in this chunk (0-1)


class Retriever:
    def __init__(self, chunks: list[Chunk], k1: float = 1.5, b: float = 0.75):
        self.chunks = chunks
        self.k1, self.b = k1, b

        # Title and section words are repeated so headings carry extra weight.
        self._tf: list[Counter] = []
        self._len: list[int] = []
        df: Counter = Counter()
        for chunk in chunks:
            tokens = tokenize(f"{chunk.title} {chunk.section} {chunk.section} {chunk.text}")
            counts = Counter(tokens)
            self._tf.append(counts)
            self._len.append(len(tokens))
            df.update(counts.keys())

        n = len(chunks)
        self._avg_len = (sum(self._len) / n) if n else 0.0
        self._idf = {t: math.log(1 + (n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def search(self, query: str, k: int = 5, min_score: float = 0.0, min_coverage: float = 0.0) -> list[Hit]:
        terms = [t for t in dict.fromkeys(tokenize(query, expand=True)) if t in self._idf]
        if not terms:
            return []
        all_terms = set(tokenize(query, expand=True))
        about_app = bool(all_terms & _INTERNAL_TRIGGERS)

        hits = []
        for i, chunk in enumerate(self.chunks):
            tf = self._tf[i]
            score = 0.0
            matched = 0
            for term in terms:
                f = tf.get(term, 0)
                if not f:
                    continue
                matched += 1
                norm = f + self.k1 * (1 - self.b + self.b * self._len[i] / self._avg_len)
                score += self._idf[term] * f * (self.k1 + 1) / norm
            if chunk.internal and not about_app:
                score *= _INTERNAL_DISCOUNT
            if score > 0:
                hits.append(Hit(chunk, score, matched / max(len(all_terms), 1)))

        hits.sort(key=lambda h: h.score, reverse=True)
        # Relevance gate: both signals must clear the bar for the best hit,
        # otherwise the question is treated as "not covered".
        if not hits or hits[0].score < min_score or hits[0].coverage < min_coverage:
            return []
        return hits[:k]


_retriever: Retriever | None = None


def get_retriever() -> Retriever:
    global _retriever
    if _retriever is None:
        _retriever = Retriever(load_chunks())
    return _retriever
