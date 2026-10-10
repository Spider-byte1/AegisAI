from jose import jwt

from app.core.config import settings
from app.database import SessionLocal
from app.models.user import User
from tests.conftest import register_and_login


def test_password_is_hashed_not_stored_plaintext(client):
    register_and_login(client, "alice", "correct-horse-battery")
    db = SessionLocal()
    user = db.query(User).one()
    db.close()
    assert user.hashed_password != "correct-horse-battery"
    assert user.hashed_password.startswith("$2")  # bcrypt


def test_duplicate_email_rejected(client):
    register_and_login(client, "alice")
    r = client.post("/auth/register", json={"username": "other", "email": "alice@example.org", "password": "another-long-password"})
    assert r.status_code == 400


def test_weak_or_oversized_password_rejected(client):
    base = {"username": "bob", "email": "bob@example.org"}
    assert client.post("/auth/register", json={**base, "password": "short"}).status_code == 422
    assert client.post("/auth/register", json={**base, "password": "x" * 100}).status_code == 422


def test_login_wrong_password_and_unknown_user_look_identical(client):
    register_and_login(client, "alice")
    wrong = client.post("/auth/login", data={"username": "alice@example.org", "password": "nope-nope-nope"})
    unknown = client.post("/auth/login", data={"username": "ghost@example.org", "password": "nope-nope-nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_me_requires_valid_token(client, auth):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401
    r = client.get("/auth/me", headers=auth)
    assert r.status_code == 200 and r.json()["email"] == "alice@example.org"
    assert "password" not in r.text


def test_token_signed_with_other_key_or_alg_none_is_rejected(client, auth):
    forged = jwt.encode({"sub": "1"}, "not-the-real-secret-key-not-the-real-one", algorithm="HS256")
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401

    # alg=none token crafted by hand
    import base64, json
    b64 = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b"=").decode()
    none_token = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': '1'})}."
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {none_token}"}).status_code == 401


def test_expired_token_rejected(client, auth):
    from datetime import datetime, timedelta, timezone
    expired = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        settings.SECRET_KEY, algorithm=settings.ALGORITHM,
    )
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401


def test_protected_routes_need_auth(client):
    for method, path in [
        ("get", "/history/"), ("get", "/dashboard/stats"), ("get", "/profile/"),
        ("post", "/scanner/start"), ("get", "/scanner/status/1"), ("get", "/scanner/result/1"),
        ("post", "/recon/scan"), ("post", "/risk/"), ("delete", "/history/1"),
    ]:
        r = getattr(client, method)(path)
        assert r.status_code == 401, f"{method.upper()} {path} -> {r.status_code}"
