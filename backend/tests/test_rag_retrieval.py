"""Retrieval quality checks: a small labelled question set, like an evaluation harness."""
import pytest

from app.core.config import settings
from app.rag.loader import load_chunks, parse_markdown
from app.rag.retriever import Retriever, get_retriever, tokenize

# (question, document that should be among the top 3 results)
LABELLED = [
    ("What is the difference between SPF, DKIM and DMARC?", "email-phishing"),
    ("Why is Telnet on port 23 risky?", "network-ports-services"),
    ("How do I triage a SOC alert?", "soc-operations"),
    ("Explain CVSS severity levels", "vulnerability-management"),
    ("What does Windows event ID 4625 mean?", "log-analysis"),
    ("How does AegisAI calculate the risk score?", "how-aegisai-works"),
    ("What are the OWASP Top 10 categories?", "owasp-top-10"),
    ("How do I prevent SQL injection?", "web-vulnerabilities"),
    ("What is SSRF and how do I defend against it?", "web-vulnerabilities"),
    ("How should passwords be stored?", "authentication-passwords"),
    ("What is the difference between symmetric and asymmetric encryption?", "cryptography-tls"),
    ("What are the phases of incident response?", "incident-response"),
    ("Which MITRE ATT&CK tactics exist?", "mitre-attack"),
    ("What does a filtered port mean in nmap?", "nmap-and-scanning"),
    ("How can I defend against ransomware?", "malware-ransomware"),
    ("What is the 3-2-1 backup rule?", "secure-hygiene-hardening"),
    ("What is a zero-day vulnerability?", "threat-landscape"),
    ("What is the difference between IDS and IPS?", "network-security"),
    ("What is the CIA triad?", "security-fundamentals"),
    ("What are JWT security mistakes?", "authentication-passwords"),
    ("how do hackers use phishing emails", "email-phishing"),
    ("Is port 3389 safe to expose to the internet?", "network-ports-services"),
    ("What is a false positive in vulnerability scanning?", "vulnerability-management"),
    ("What is password spraying?", "authentication-passwords"),
    ("how to detect brute force in logs", "log-analysis"),
    ("why are old TLS versions deprecated", "cryptography-tls"),
    ("what is EDR", "soc-operations"),
    ("What is credential stuffing?", "authentication-passwords"),
    ("What is a SIEM?", "soc-operations"),
    ("What is the cyber kill chain?", "mitre-attack"),
]

OFF_TOPIC = [
    "What is the capital of France?",
    "How do I bake a chocolate cake?",
    "Tell me a joke about cats",
    "Write a Python function for fibonacci numbers",
    "Who won the football world cup?",
    "What's the weather in Delhi today?",
    "Explain quantum physics",
    "Recommend a good movie",
    "How do I lose weight fast?",
    "What is the best programming language to learn?",
]


def search(question):
    return get_retriever().search(
        question, k=5, min_score=settings.RAG_MIN_SCORE, min_coverage=settings.RAG_MIN_COVERAGE
    )


def test_knowledge_base_loads_cleanly():
    chunks = load_chunks()
    assert len(chunks) > 60
    assert [c.id for c in chunks] == list(range(1, len(chunks) + 1))
    assert all(c.title and c.section and c.text.strip() for c in chunks)
    assert max(len(c.text.split()) for c in chunks) <= 250


def test_long_sections_are_split_on_paragraphs():
    para = " ".join(["word"] * 150)
    parts = parse_markdown("doc", f"# T\n\n## S\n{para}\n\n{para}\n")
    assert len(parts) == 2 and all(p[2] == "S" for p in parts)


def test_retrieval_hit_rate_on_labelled_questions():
    top1 = top3 = 0
    misses = []
    for question, doc in LABELLED:
        docs = [h.chunk.doc for h in search(question)]
        top1 += bool(docs) and docs[0] == doc
        if doc in docs[:3]:
            top3 += 1
        else:
            misses.append((question, docs[:3]))
    n = len(LABELLED)
    assert top3 / n >= 0.95, f"hit@3 {top3}/{n}; misses: {misses}"
    assert top1 / n >= 0.85, f"hit@1 {top1}/{n}"


@pytest.mark.parametrize("question", OFF_TOPIC)
def test_off_topic_questions_find_nothing(question):
    assert search(question) == []


def test_aegisai_scoring_doc_matches_real_constants():
    from app.services.risk_engine import RISKY_PORTS, SEVERITY_POINTS

    text = " ".join(c.text for c in load_chunks() if c.doc == "how-aegisai-works")
    for port, points in RISKY_PORTS.items():
        assert f"port {port}" in text and f"adds {points}" in text
    for name, points in SEVERITY_POINTS.items():
        assert f"{name} {points}" in text


def test_tokenizer_handles_plurals_gerunds_and_synonyms():
    assert tokenize("scanning scans scanned scan") == ["scan"] * 4
    assert tokenize("logging logs") == ["log", "log"]
    assert "attacker" in tokenize("hackers", expand=True)
    assert set(tokenize("SQLi", expand=True)) >= {"sql", "injection"}


def test_retriever_on_tiny_corpus():
    from app.rag.loader import Chunk

    r = Retriever([
        Chunk(1, "a", "Cats", "Pets", "cats purr and sleep"),
        Chunk(2, "b", "Ports", "Telnet", "telnet sends passwords in clear text on port 23"),
    ])
    hits = r.search("telnet password", k=3)
    assert hits and hits[0].chunk.doc == "b"
    assert r.search("zzzz qqqq") == []


def test_generic_question_is_not_hijacked_by_aegisai_internal_docs():
    top = search("Why is Telnet on port 23 risky?")[0].chunk
    assert top.doc == "network-ports-services"
    # ...but a question that is about the app still finds the app's own docs first
    assert search("How does AegisAI calculate the risk score?")[0].chunk.doc == "how-aegisai-works"
    assert search("what ports does this tool treat as risky")[0].chunk.doc == "how-aegisai-works"
