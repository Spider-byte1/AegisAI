from app.database import SessionLocal
from app.models.scan import Scan
from app.worker.tasks import run_scan_task

OPEN_PORTS = [
    {"port": 80, "protocol": "tcp", "state": "open", "service": "http", "product": "Apache httpd", "version": "2.4.49"},
    {"port": 22, "protocol": "tcp", "state": "open", "service": "ssh", "product": "OpenSSH", "version": "9.6p1"},
    {"port": 25, "protocol": "tcp", "state": "filtered", "service": "smtp", "product": None, "version": None},
]


def _patch_network(monkeypatch, tmp_path):
    monkeypatch.setattr(
        "app.services.scan_engine.run_scan",
        lambda target: {"target": target, "hosts": [{"host": target, "hostname": "", "state": "up", "ports": OPEN_PORTS}]},
    )
    # WHOIS returns sets/datetimes in real life - make sure those survive JSON storage.
    monkeypatch.setattr("app.services.scanner_service.collect_asset_info",
                        lambda host, kind="domain": {"whois": {"name_servers": {"a.iana-servers.net"}}, "dns": {"A": ["93.184.216.34"]}, "ssl": {}})
    monkeypatch.setattr("app.services.pdf_service.REPORT_DIR", tmp_path)


def test_full_scan_pipeline(client, auth, queued, monkeypatch, tmp_path):
    _patch_network(monkeypatch, tmp_path)
    scan_id = client.post("/scanner/start", json={"target": "example.com", "authorized": True}, headers=auth).json()["scan_id"]

    run_scan_task(scan_id, "example.com")  # what the Celery worker would do

    status = client.get(f"/scanner/status/{scan_id}", headers=auth).json()
    assert status["status"] == "completed" and status["progress"] == 100
    # Apache 2.4.49 -> High CVE (25) + ports 80 (10) + 22 (5); filtered 25/tcp ignored
    assert status["risk"] == {"score": 40, "level": "HIGH"}

    result = client.get(f"/scanner/result/{scan_id}", headers=auth).json()["scan"]
    assert result["risk"]["level"] == "HIGH"
    assert [v["cve"] for v in result["details"]["vulnerabilities"]] == ["CVE-2021-41773"]
    assert len(result["details"]["ports"]) == 2  # only open ports kept

    pdf = client.get(f"/scanner/report/{scan_id}", headers=auth)
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")

    # exactly one history row per scan (the old pipeline created two)
    history = client.get("/history/", headers=auth).json()
    assert len(history) == 1 and history[0]["risk"] == "HIGH"

    stats = client.get("/dashboard/stats", headers=auth).json()
    assert stats["total_scans"] == 1 and stats["high_risk"] == 1

    # deleting a scan also removes its PDF
    assert client.delete(f"/history/{scan_id}", headers=auth).status_code == 200
    assert not list(tmp_path.glob("*.pdf"))


def test_worker_failure_is_reported_without_leaking_internals(client, auth, queued, monkeypatch, tmp_path):
    _patch_network(monkeypatch, tmp_path)
    scan_id = client.post("/scanner/start", json={"target": "example.com", "authorized": True}, headers=auth).json()["scan_id"]

    def explode(target):
        raise RuntimeError("password=hunter2 host=db.internal")
    monkeypatch.setattr("app.services.scan_engine.run_scan", explode)

    run_scan_task(scan_id, "example.com")

    status = client.get(f"/scanner/status/{scan_id}", headers=auth).json()
    assert status["status"] == "failed"
    assert "hunter2" not in status["message"] and "db.internal" not in status["message"]


def test_worker_revalidates_target(client, auth, queued):
    """Even if a bad target reached the queue, the worker refuses to scan it."""
    db = SessionLocal()
    from app.models.user import User
    uid = db.query(User).one().id
    scan = Scan(user_id=uid, target="127.0.0.1", status="queued")
    db.add(scan); db.commit(); sid = scan.id; db.close()

    run_scan_task(sid, "127.0.0.1")

    status = client.get(f"/scanner/status/{sid}", headers=auth).json()
    assert status["status"] == "failed"


# ------------------------------------------------------------------ report download
def _completed_scan(client, auth, queued, monkeypatch, tmp_path):
    _patch_network(monkeypatch, tmp_path)
    scan_id = client.post("/scanner/start", json={"target": "example.com", "authorized": True}, headers=auth).json()["scan_id"]
    run_scan_task(scan_id, "example.com")
    return scan_id


def _text(content: bytes) -> str:
    import io
    from pypdf import PdfReader
    return "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(content)).pages)


def test_report_is_the_eight_section_summary_with_the_scan_date(client, auth, queued, monkeypatch, tmp_path):
    scan_id = _completed_scan(client, auth, queued, monkeypatch, tmp_path)
    r = client.get(f"/scanner/report/{scan_id}", headers=auth)
    assert r.status_code == 200 and r.headers["content-type"] == "application/pdf"
    assert 'filename="aegisai_scan_' in r.headers["content-disposition"]
    text = _text(r.content)
    assert "1. Executive summary" in text and "8. Scope and limitations" in text
    assert "CVE-2021-41773" in text and "Scanned" in text and "UTC" in text


def test_a_deleted_pdf_is_recreated_on_download(client, auth, queued, monkeypatch, tmp_path):
    scan_id = _completed_scan(client, auth, queued, monkeypatch, tmp_path)
    for f in tmp_path.glob("*.pdf"):
        f.unlink()
    assert not list(tmp_path.glob("*.pdf"))
    r = client.get(f"/scanner/report/{scan_id}", headers=auth)
    assert r.status_code == 200 and r.content.startswith(b"%PDF")
    assert [f.name for f in tmp_path.glob("*.pdf")] == [f"scan_{scan_id}.pdf"]


def test_scans_saved_by_older_versions_still_produce_the_new_report(client, auth, queued, monkeypatch, tmp_path):
    """Results stored before risk_factors / scanned_at existed must not break the download."""
    scan_id = _completed_scan(client, auth, queued, monkeypatch, tmp_path)
    db = SessionLocal()
    scan = db.get(Scan, scan_id)
    old = dict(scan.result)
    for key in ("risk_factors", "scanned_at"):
        old.pop(key, None)
    scan.result = old
    db.commit(); db.close()

    r = client.get(f"/scanner/report/{scan_id}", headers=auth)
    assert r.status_code == 200
    text = _text(r.content)
    assert "1. Executive summary" in text and "6. Recommendations" in text
    # no stored breakdown: it is rebuilt from the saved ports and CVEs, so the report never claims "score 0"
    assert "Total (capped at 100)" in text and "Open port HTTP (80)" in text
    assert "CVE-2021-41773 (High)" in text and "No risk factors were identified" not in text
    assert "UTC" in text  # scan date comes from the database record when the result lacks it


def test_report_is_not_available_until_the_scan_completes(client, auth, queued):
    scan_id = client.post("/scanner/start", json={"target": "example.com", "authorized": True}, headers=auth).json()["scan_id"]
    r = client.get(f"/scanner/report/{scan_id}", headers=auth)
    assert r.status_code == 404 and "not ready" in r.json()["detail"]


def test_report_failure_returns_a_generic_error(client, auth, queued, monkeypatch, tmp_path):
    scan_id = _completed_scan(client, auth, queued, monkeypatch, tmp_path)

    def boom(*a, **k):
        raise RuntimeError("disk full /secret/path")
    monkeypatch.setattr("app.api.scanner.generate_pdf", boom)
    r = client.get(f"/scanner/report/{scan_id}", headers=auth)
    assert r.status_code == 500 and "secret" not in r.text and "RuntimeError" not in r.text
