def test_scan_requires_authorization_flag(client, auth_headers):
    r = client.post("/scanner/start", json={"target": "example.com"}, headers=auth_headers)
    assert r.status_code == 400


def test_invalid_target_rejected(client, auth_headers):
    r = client.post("/scanner/start", json={"target": "bad target; ls", "authorized": True}, headers=auth_headers)
    assert r.status_code == 422


def test_full_scan_flow(client, auth_headers, fake_scanners):
    r = client.post("/scanner/start", json={"target": "https://Example.com/", "authorized": True}, headers=auth_headers)
    assert r.status_code == 202
    scan_id = r.json()["id"]

    # TestClient runs background tasks before returning, so the scan is already done
    status = client.get(f"/scanner/{scan_id}/status", headers=auth_headers).json()
    assert status["status"] == "completed" and status["progress"] == 100

    detail = client.get(f"/scanner/{scan_id}", headers=auth_headers).json()
    res = detail["results"]
    assert res["target"] == "example.com"
    assert {p["port"] for p in res["ports"]} == {22, 23, 80}
    assert any(v["cve"] == "CVE-2021-41773" for v in res["vulnerabilities"])
    assert detail["risk_level"] in ("Medium", "High", "Critical")
    assert res["recommendations"][0]["priority"] == "Immediate"
    assert res["executive_summary"]["source"] == "rule-based"

    # history + dashboard see it
    hist = client.get("/history/?search=example", headers=auth_headers).json()
    assert hist["total"] == 1
    dash = client.get("/dashboard/", headers=auth_headers).json()
    assert dash["total_scans"] == 1 and dash["reports"] == 1
    assert dash["top_ports"][0]["count"] == 1

    # PDF report
    pdf = client.get(f"/reports/download/{detail['report_file']}", headers=auth_headers)
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")


def test_scans_are_private_per_user(client, auth_headers, fake_scanners):
    scan_id = client.post("/scanner/start", json={"target": "example.com", "authorized": True},
                          headers=auth_headers).json()["id"]
    other = client.post("/auth/register", json={"email": "other@example.com", "password": "StrongPass123"})
    token = client.post("/auth/login", json={"email": "other@example.com", "password": "StrongPass123"}).json()["access_token"]
    h2 = {"Authorization": f"Bearer {token}"}
    assert client.get(f"/scanner/{scan_id}", headers=h2).status_code == 404
    fname = client.get(f"/scanner/{scan_id}", headers=auth_headers).json()["report_file"]
    assert client.get(f"/reports/download/{fname}", headers=h2).status_code == 404


def test_report_path_traversal_blocked(client, auth_headers):
    assert client.get("/reports/download/..%2F..%2Fetc%2Fpasswd", headers=auth_headers).status_code == 404
