def test_register_login_me(client):
    body = {"email": "a@example.com", "password": "StrongPass123", "full_name": "A"}
    assert client.post("/auth/register", json=body).status_code == 201
    assert client.post("/auth/register", json=body).status_code == 409  # duplicate

    bad = client.post("/auth/login", json={"email": "a@example.com", "password": "wrong-password"})
    assert bad.status_code == 401

    token = client.post("/auth/login", json={"email": "a@example.com", "password": "StrongPass123"}).json()["access_token"]
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["email"] == "a@example.com"


def test_protected_routes_require_token(client):
    for path in ("/dashboard/", "/history/", "/profile/"):
        assert client.get(path).status_code == 401


def test_short_password_rejected(client):
    r = client.post("/auth/register", json={"email": "b@example.com", "password": "short"})
    assert r.status_code == 422
