import os
import secrets
import socket

# Must be set before any `app` import: config validates these at import time.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = secrets.token_urlsafe(48)
os.environ["ALLOW_PRIVATE_TARGETS"] = "false"
os.environ["ANTHROPIC_API_KEY"] = ""  # tests never call the real API

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app

PUBLIC_IP = "93.184.216.34"


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def fake_dns(monkeypatch):
    """Deterministic DNS: names resolve to a fixed public IP unless they look internal."""
    real = socket.getaddrinfo

    def fake(host, *args, **kwargs):
        table = {
            "example.com": PUBLIC_IP,
            "localhost": "127.0.0.1",
            "internal.example.com": "10.0.0.5",
            "metadata.example.com": "169.254.169.254",
        }
        if host in table:
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (table[host], 0))]
        if host == "mixed.example.com":
            return [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", (PUBLIC_IP, 0)),
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.168.1.10", 0)),
            ]
        if host == "nxdomain.example.com":
            raise socket.gaierror("not found")
        return real(host, *args, **kwargs)

    monkeypatch.setattr(socket, "getaddrinfo", fake)


@pytest.fixture
def queued(monkeypatch):
    """Replace Celery's .delay so tests don't need Redis; records calls."""
    calls = []
    monkeypatch.setattr("app.api.scanner.run_scan_task.delay", lambda *a, **k: calls.append(a))
    return calls


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def register_and_login(client, name="alice", password="correct-horse-battery"):
    email = f"{name}@example.org"
    r = client.post("/auth/register", json={"username": name, "email": email, "password": password})
    assert r.status_code == 201, r.text
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def auth(client):
    return register_and_login(client)


class FakeLLM:
    """Stands in for the Anthropic client; records what it was sent."""

    def __init__(self, reply="Answer based on the sources [1].", fail_after=None):
        self.reply = reply
        self.fail_after = fail_after  # stream: raise after this many pieces
        self.calls = []

    def complete(self, system, messages, max_tokens):
        self.calls.append({"system": system, "messages": messages, "max_tokens": max_tokens})
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply

    def stream(self, system, messages, max_tokens):
        from app.rag.llm import LLMUnavailable

        self.calls.append({"system": system, "messages": messages, "max_tokens": max_tokens})
        if isinstance(self.reply, Exception):
            raise self.reply
        words = self.reply.split(" ")
        for i, word in enumerate(words):
            if self.fail_after is not None and i >= self.fail_after:
                raise LLMUnavailable("APIConnectionError")
            yield word + (" " if i < len(words) - 1 else "")


@pytest.fixture
def fake_llm(monkeypatch):
    llm = FakeLLM()
    monkeypatch.setattr("app.rag.service.get_llm_client", lambda: llm)
    return llm
