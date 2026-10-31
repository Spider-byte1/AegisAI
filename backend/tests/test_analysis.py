import pytest

from app.services import analysis_service as svc
from app.services.agents import agent_states
from tests.conftest import register_and_login
from tests.helpers import OPEN, SAMPLE_ASSETS, build_details, insert_scan


# ------------------------------------------------------------------ grades & health
@pytest.mark.parametrize("health,grade", [(100, "A+"), (97, "A+"), (96, "A"), (93, "A"), (92, "A-"), (90, "A-"), (89, "B+"),
                                          (87, "B+"), (83, "B"), (80, "B-"), (77, "C+"), (73, "C"), (70, "C-"),
                                          (69, "D"), (60, "D"), (59, "F"), (0, "F")])
def test_grade_boundaries(health, grade):
    assert svc.grade_for(health) == grade


def test_health_is_the_inverse_of_risk_and_stays_in_range():
    assert svc.health_score(0) == 100 and svc.health_score(18) == 82 and svc.health_score(100) == 0
    assert svc.health_score(150) == 0 and svc.health_score(None) == 100


# ------------------------------------------------------------------ agents (live pipeline states)
def states(status, progress):
    return {a["id"]: a["status"] for a in agent_states(status, progress)}


def test_agents_wait_until_the_pipeline_reaches_them():
    assert set(states("queued", 0).values()) == {"waiting"}
    assert set(states("running", 10).values()) == {"waiting"}          # task started, no stage yet
    assert states("running", 15) == {"recon": "running", "nmap": "waiting", "cve": "waiting", "risk": "waiting", "report": "waiting"}


@pytest.mark.parametrize("progress,done,running", [
    (35, ["recon"], "nmap"), (65, ["recon", "nmap"], "cve"), (80, ["recon", "nmap", "cve"], "risk"),
    (90, ["recon", "nmap", "cve", "risk"], "report")])
def test_agents_advance_in_pipeline_order(progress, done, running):
    s = states("running", progress)
    assert [k for k, v in s.items() if v == "completed"] == done and s[running] == "running"


def test_everything_is_completed_when_the_scan_is():
    assert set(states("completed", 100).values()) == {"completed"}
    assert [a["progress"] for a in agent_states("completed", 100)] == [100] * 5


def test_a_running_agent_has_no_fake_percentage():
    running = [a for a in agent_states("running", 40) if a["status"] == "running"]
    assert [a["id"] for a in running] == ["nmap"] and running[0]["progress"] is None


def test_failure_marks_the_active_agent_and_leaves_later_ones_waiting():
    assert states("failed", 40) == {"recon": "completed", "nmap": "failed", "cve": "waiting", "risk": "waiting", "report": "waiting"}
    assert states("failed", 10)["recon"] == "failed"   # failed before any stage began


def test_pipeline_reports_progress_at_exactly_the_agent_stage_boundaries(monkeypatch, tmp_path):
    from app.services import scanner_service

    monkeypatch.setattr("app.services.scan_engine.run_scan", lambda t: {"hosts": []})
    monkeypatch.setattr(scanner_service, "collect_asset_info", lambda host, kind="domain": {})
    monkeypatch.setattr("app.services.pdf_service.REPORT_DIR", tmp_path)
    monkeypatch.setattr("app.scanners.validator.resolve_target", lambda kind, host: "93.184.216.34")
    seen = []
    scanner_service.start_scan("example.com", 1, on_progress=lambda pct, msg: seen.append((pct, msg)))
    assert [p for p, _ in seen] == [15, 35, 65, 80, 90]
    assert seen[0][1].startswith("Reconnaissance") and seen[1][1].startswith("Scanning ports")


# ------------------------------------------------------------------ findings, alerts, recommendations
def analysis(**kw):
    return svc.build_analysis(build_details(**kw), scan_id=7)


def test_findings_are_ranked_and_explain_the_real_scan():
    a = analysis()
    severities = [f["severity"] for f in a["analyst"]["findings"]]
    assert severities == sorted(severities, key=lambda s: -svc.SEVERITY_RANK[s])
    titles = [f["title"] for f in a["analyst"]["findings"]]
    assert any("Telnet service detected on port 23" in t for t in titles)
    assert any("CVE-2021-41773" in t for t in titles)
    assert any("SSH service detected on port 22" in t for t in titles)
    assert a["analyst"]["title"] == "AegisAI Analyst Report" and a["analyst"]["target"] == "example.com"


def test_alerts_are_medium_and_above_with_a_risk_score_and_action():
    a = analysis()
    by_id = {x["id"]: x for x in a["alerts"]}
    assert set(by_id) == {"port:23", "port:80", "cve:CVE-2021-41773"}   # Telnet, HTTP (medium advice) and the CVE
    cve = by_id["cve:CVE-2021-41773"]
    assert cve["severity"] == "high" and cve["risk_score"] == 75                 # CVSS 7.5 -> 75/100
    assert "Upgrade or patch Apache httpd immediately" in cve["action"]
    assert by_id["port:23"]["severity"] == "critical" and by_id["port:23"]["risk_score"] == 90
    assert all(svc.SEVERITY_RANK[x["severity"]] >= 2 for x in a["alerts"])       # nothing below medium


def test_recommendations_come_from_the_same_engine_as_the_pdf():
    recs = analysis()["analyst"]["recommendations"]
    assert [r["priority"] for r in recs][:2] == ["Immediate", "Critical"]
    assert any("Telnet is unencrypted" in r["text"] for r in recs)
    assert any("multi-factor authentication" in r["text"] for r in recs)          # SSH advice mentions MFA


def test_clean_host_has_no_alerts_and_a_calm_statement():
    a = analysis(ports=[])
    assert a["alerts"] == [] and a["executive"]["technical_findings"] == 0
    assert a["executive"]["business_risk"] == "LOW" and "no security issues" in a["executive"]["statement"]
    assert a["health"]["score"] == 100 and a["health"]["grade"] == "A+"
    assert [f["severity"] for f in a["analyst"]["findings"]] == ["info"]


# ------------------------------------------------------------------ executive view
def test_business_risk_is_raised_when_an_alert_is_worse_than_the_score():
    a = analysis(ports=[OPEN(23, "telnet")])           # score 10 -> LOW, but Telnet is a critical alert
    assert a["analyst"]["risk_level"] == "LOW" and a["executive"]["business_risk"] == "HIGH"
    assert a["executive"]["critical_issues"] == 1
    only_high = analysis(ports=[OPEN(3306, "mysql")])  # exposed DB: high alert, score 0
    assert only_high["analyst"]["risk_level"] == "LOW" and only_high["executive"]["business_risk"] == "MEDIUM"


def test_executive_counts_match_the_findings():
    a = analysis()
    actionable = [f for f in a["analyst"]["findings"] if f["severity"] != "info"]
    ex = a["executive"]
    assert ex["technical_findings"] == len(actionable)
    assert ex["critical_issues"] == sum(f["severity"] == "critical" for f in actionable)
    assert ex["recommended_actions"] == len(a["analyst"]["recommendations"])
    assert "Recommended next step" in ex["statement"]


# ------------------------------------------------------------------ TLS expiry
def tls(not_after):
    return {**SAMPLE_ASSETS, "ssl": {**SAMPLE_ASSETS["ssl"], "not_after": not_after}}


def tls_findings(not_after, scanned_at="2026-10-10 12:00:00 UTC"):
    a = svc.build_analysis(build_details(ports=[], assets=tls(not_after), scanned_at=scanned_at), scan_id=1)
    return [f for f in a["analyst"]["findings"] if f["id"] == "tls:cert"], a


def test_expired_certificate_is_a_high_finding_and_marks_the_tls_node():
    found, a = tls_findings("Jan  1 00:00:00 2026 GMT")
    assert found and found[0]["severity"] == "high" and "expired" in found[0]["title"]
    assert next(n for n in a["surface"]["nodes"] if n["id"] == "tls")["severity"] == "high"


def test_certificate_expiring_soon_is_medium_and_a_distant_one_is_not_reported():
    found, _ = tls_findings("Oct 20 12:00:00 2026 GMT")
    assert found[0]["severity"] == "medium" and "expires in 10 days" in found[0]["title"]
    assert tls_findings("Jan  1 00:00:00 2031 GMT")[0] == []
    assert tls_findings("not a date")[0] == []                       # unparseable: no finding, no crash


# ------------------------------------------------------------------ attack surface graph
def test_surface_graph_is_consistent_and_classifies_entry_points():
    surface = analysis()["surface"]
    nodes = {n["id"]: n for n in surface["nodes"]}
    assert len(nodes) == len(surface["nodes"])                                    # unique ids
    assert nodes["target"]["kind"] == "target"
    assert nodes["port-23"]["kind"] == "remote_access" and "entry point" in nodes["port-23"]["note"]
    assert nodes["port-80"]["kind"] == "web" and "Web attack surface" in nodes["port-80"]["note"]
    assert nodes["port-80"]["severity"] == "high"                                 # raised by its CVE
    cve_nodes = [n for n in surface["nodes"] if n["kind"] == "vulnerability"]
    assert [n["label"] for n in cve_nodes] == ["CVE-2021-41773"]
    for edge in surface["edges"]:
        assert edge["source"] in nodes and edge["target"] in nodes
    assert {"source": "port-80", "target": cve_nodes[0]["id"]} in surface["edges"]
    assert any(n["kind"] == "dns" for n in surface["nodes"]) and "tls" in nodes


def test_surface_caps_dns_nodes():
    many = {"dns": {"A": [f"1.1.1.{i}" for i in range(10)], "MX": [f"mx{i}" for i in range(10)], "NS": ["a", "b"]}, "ssl": {}}
    nodes = svc.build_analysis(build_details(ports=[], assets=many), scan_id=1)["surface"]["nodes"]
    assert sum(n["kind"] == "dns" for n in nodes) <= 6


# ------------------------------------------------------------------ previous scan comparison
def test_health_compares_with_the_previous_scan_of_the_same_target(client, auth):
    uid = client.get("/auth/me", headers=auth).json()["id"]
    insert_scan(uid, build_details(ports=[OPEN(23, "telnet"), OPEN(21, "ftp"), OPEN(80, "http")]), target="example.com")  # score 30
    insert_scan(uid, build_details(ports=[OPEN(443, "https")], target="other.example.org"), target="other.example.org")
    newest = insert_scan(uid, build_details(ports=[OPEN(443, "https")]), target="example.com")                           # score 5
    health = client.get(f"/scanner/analysis/{newest}", headers=auth).json()["health"]
    assert health["score"] == 95 and health["previous_score"] == 70 and health["delta"] == 25
    assert health["grade"] == "A"


def test_first_scan_of_a_target_has_no_comparison(client, auth):
    uid = client.get("/auth/me", headers=auth).json()["id"]
    first = insert_scan(uid)
    health = client.get(f"/scanner/analysis/{first}", headers=auth).json()["health"]
    assert health["previous_score"] is None and health["delta"] is None


# ------------------------------------------------------------------ endpoints
def test_analysis_endpoints_require_login_and_ownership(client, auth):
    assert client.get("/scanner/analysis/1").status_code == 401
    assert client.get("/scanner/analysis/latest").status_code == 401
    uid = client.get("/auth/me", headers=auth).json()["id"]
    sid = insert_scan(uid)
    bob = register_and_login(client, "bob")
    assert client.get(f"/scanner/analysis/{sid}", headers=bob).status_code == 404
    assert client.get("/scanner/analysis/latest", headers=bob).status_code == 404


def test_analysis_is_not_available_until_the_scan_completes(client, auth):
    uid = client.get("/auth/me", headers=auth).json()["id"]
    sid = insert_scan(uid, details=None, status="running", progress=40)
    r = client.get(f"/scanner/analysis/{sid}", headers=auth)
    assert r.status_code == 404 and "not ready" in r.json()["detail"]


def test_latest_analysis_returns_the_newest_completed_scan(client, auth):
    assert client.get("/scanner/analysis/latest", headers=auth).status_code == 404       # nothing yet
    uid = client.get("/auth/me", headers=auth).json()["id"]
    insert_scan(uid, target="old.example.com", details=build_details(target="old.example.com"))
    newest = insert_scan(uid, target="new.example.com", details=build_details(target="new.example.com"))
    insert_scan(uid, details=None, status="running", progress=40)                         # newer, but unfinished
    body = client.get("/scanner/analysis/latest", headers=auth).json()
    assert body["scan_id"] == newest and body["target"] == "new.example.com"
    assert set(body) >= {"analyst", "health", "executive", "alerts", "surface", "agents"}


def test_live_status_includes_agent_states(client, auth):
    uid = client.get("/auth/me", headers=auth).json()["id"]
    sid = insert_scan(uid, details=None, status="running", progress=40)
    agents = client.get(f"/scanner/status/{sid}", headers=auth).json()["agents"]
    assert [a["id"] for a in agents] == ["recon", "nmap", "cve", "risk", "report"]
    assert {a["id"]: a["status"] for a in agents}["nmap"] == "running"


def test_analysis_survives_scans_saved_by_older_versions(client, auth):
    uid = client.get("/auth/me", headers=auth).json()["id"]
    old = build_details()
    for key in ("risk_factors", "scanned_at"):
        old.pop(key)
    old.pop("services")                     # very old results had only ports
    sid = insert_scan(uid, old)
    body = client.get(f"/scanner/analysis/{sid}", headers=auth).json()
    assert body["analyst"]["findings"] and body["health"]["grade"]
