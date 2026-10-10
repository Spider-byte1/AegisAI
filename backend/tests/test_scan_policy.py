import pytest

from tests.conftest import PUBLIC_IP, register_and_login


def start(client, auth, target, authorized=True):
    return client.post("/scanner/start", json={"target": target, "authorized": authorized}, headers=auth)


@pytest.mark.parametrize(
    "target",
    [
        "localhost", "127.0.0.1", "::1", "::ffff:127.0.0.1", "0.0.0.0",
        "10.0.0.5", "192.168.1.1", "172.16.0.9", "100.64.0.1",
        "169.254.169.254",            # cloud metadata
        "internal.example.com",       # resolves to 10.0.0.5
        "metadata.example.com",       # resolves to 169.254.169.254
        "mixed.example.com",          # one public + one private record
    ],
)
def test_internal_targets_rejected(client, auth, queued, target):
    r = start(client, auth, target)
    assert r.status_code == 400, f"{target} -> {r.status_code} {r.text}"
    assert queued == []


@pytest.mark.parametrize(
    "target",
    [
        "example.com -oN /tmp/pwned",   # nmap argument injection
        "-sV", "--script=vuln", "example.com;id", "$(id).example.com",
        "10.0.0.0/24", "93.184.216.0/24",  # ranges
        "http://example.com", "example.com/path", "exa mple.com", "", "   ",
        "a" * 300, "nxdomain.example.com",
    ],
)
def test_malformed_targets_rejected(client, auth, queued, target):
    r = start(client, auth, target)
    assert r.status_code in (400, 422), f"{target!r} -> {r.status_code}"
    assert queued == []


def test_authorization_confirmation_required(client, auth, queued):
    assert start(client, auth, "example.com", authorized=False).status_code == 400
    assert client.post("/scanner/start", json={"target": "example.com"}, headers=auth).status_code == 400
    assert queued == []


def test_public_target_is_queued(client, auth, queued):
    r = start(client, auth, "Example.COM")
    assert r.status_code == 200, r.text
    scan_id = r.json()["scan_id"]
    assert queued == [(scan_id, "example.com")]  # normalised host is what the worker receives

    st = client.get(f"/scanner/status/{scan_id}", headers=auth).json()
    assert st["status"] == "queued" and st["target"] == "example.com"


def test_public_ip_is_queued(client, auth, queued):
    assert start(client, auth, PUBLIC_IP).status_code == 200


def test_active_scan_cap(client, auth, queued):
    for _ in range(3):
        assert start(client, auth, "example.com").status_code == 200
    assert start(client, auth, "example.com").status_code == 429


def test_queue_outage_marks_scan_failed(client, auth, monkeypatch):
    def boom(*a, **k):
        raise ConnectionError("redis down")
    monkeypatch.setattr("app.api.scanner.run_scan_task.delay", boom)
    r = start(client, auth, "example.com")
    assert r.status_code == 503
    assert "redis" not in r.text.lower()  # internals not leaked
    history = client.get("/history/", headers=auth).json()
    assert history[0]["status"] == "failed"


def test_users_cannot_see_or_delete_each_others_scans(client, queued):
    alice = register_and_login(client, "alice")
    bob = register_and_login(client, "bob")
    scan_id = start(client, alice, "example.com").json()["scan_id"]

    assert client.get(f"/scanner/status/{scan_id}", headers=bob).status_code == 404
    assert client.get(f"/scanner/result/{scan_id}", headers=bob).status_code == 404
    assert client.get(f"/scanner/report/{scan_id}", headers=bob).status_code == 404
    assert client.delete(f"/history/{scan_id}", headers=bob).status_code == 404
    assert client.get("/history/", headers=bob).json() == []
    assert len(client.get("/history/", headers=alice).json()) == 1


def test_recon_uses_same_target_policy(client, auth):
    assert client.post("/recon/scan", json={"target": "127.0.0.1"}, headers=auth).status_code == 400
    assert client.post("/recon/scan", json={"target": "internal.example.com"}, headers=auth).status_code == 400
