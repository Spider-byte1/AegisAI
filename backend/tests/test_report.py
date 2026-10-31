import json
import pathlib

import pytest
from pypdf import PdfReader

from app.services import pdf_service
from app.services.pdf_service import (
    build_executive_summary, clean, collect_recommendations, dn_to_text, generate_pdf,
)
from app.services.recommendation_engine import port_recommendations
from app.services.report_service import generate_report
from app.services.risk_engine import calculate_risk, risk_factors
from app.services.vulnerability_service import analyze_services

PORTS = [
    {"port": 80, "protocol": "tcp", "state": "open", "service": "http", "product": "Apache httpd", "version": "2.4.49"},
    {"port": 23, "protocol": "tcp", "state": "open", "service": "telnet", "product": None, "version": None},
    {"port": 22, "protocol": "tcp", "state": "open", "service": "ssh", "product": "OpenSSH", "version": "9.6p1"},
    {"port": 25, "protocol": "tcp", "state": "filtered", "service": "smtp", "product": None, "version": None},
]


def make_report(ports=PORTS, target="example.com", extra=None):
    services, vulns = analyze_services("93.184.216.34", [p for p in ports if p["state"] == "open"])
    open_ports = [p for p in ports if p["state"] == "open"]
    details = {
        "target": target, "status": "completed", "risk": calculate_risk(open_ports, vulns),
        "risk_factors": risk_factors(open_ports, vulns), "ports": open_ports, "services": services,
        "vulnerabilities": vulns, **(extra or {}),
    }
    return generate_report(json.loads(json.dumps(details, default=str)))


def pdf_text(path):
    return "\n".join(page.extract_text() for page in PdfReader(path).pages)


# ---------------------------------------------------------------- risk breakdown
def test_risk_factors_add_up_to_the_score_and_explain_every_point():
    factors = risk_factors(PORTS, [{"cve": "CVE-2021-41773", "severity": "High"}])
    assert [(f["factor"], f["points"]) for f in factors] == [
        ("Open port HTTP (80)", 10), ("Open port Telnet (23)", 10), ("Open port SSH (22)", 5),
        ("Known vulnerability CVE-2021-41773 (High)", 25),
    ]
    assert calculate_risk(PORTS, [{"cve": "CVE-2021-41773", "severity": "High"}])["score"] == sum(f["points"] for f in factors)
    assert all(f["factor"] != "Open port 25" for f in factors)  # filtered ports never count


# ---------------------------------------------------------------- summary text
def test_executive_summary_is_plain_language():
    text = " ".join(build_executive_summary(make_report()))
    assert "example.com" in text and "HIGH (score 50 out of 100)" in text
    assert "3 open ports were found" in text and "Telnet (23)" in text
    assert "1 known vulnerability matched" in text and "CVE-2021-41773 (High)" in text
    assert "Prioritise fixing" in text


def test_executive_summary_for_a_clean_host():
    text = " ".join(build_executive_summary(make_report(ports=[])))
    assert "No open ports were found" in text
    assert "No known vulnerabilities matched" in text
    assert "LOW (score 0 out of 100)" in text and "No urgent action" in text


def test_singular_wording():
    one = [{"port": 443, "protocol": "tcp", "state": "open", "service": "https", "product": None, "version": None}]
    assert "1 open port was found" in " ".join(build_executive_summary(make_report(ports=one)))


# ---------------------------------------------------------------- recommendations
def test_port_recommendations_cover_risky_services_only():
    recs = port_recommendations(PORTS)
    assert {r["port"] for r in recs} == {80, 23, 22}
    assert next(r for r in recs if r["port"] == 23)["priority"] == "Critical"
    assert port_recommendations([{"port": 9999}]) == []


def test_recommendations_are_sorted_by_urgency_without_duplicates():
    recs = collect_recommendations(make_report())
    priorities = [r["priority"] for r in recs]
    assert priorities == ["Immediate", "Critical", "Medium", "Low"]
    assert len({(r["priority"], r["recommendation"]) for r in recs}) == len(recs)


# ---------------------------------------------------------------- text safety helpers
def test_certificate_names_are_readable():
    dn = [[["countryName", "US"]], [["organizationName", "Let's Encrypt"]], [["commonName", "R3"]]]
    assert dn_to_text(dn) == "C=US, O=Let's Encrypt, CN=R3"
    assert dn_to_text(None) == "-"


def test_clean_replaces_characters_the_pdf_fonts_cannot_draw():
    assert clean("caf\u00e9 \u2603") == "caf\u00e9 ?"
    assert clean(None) == "-"


# ---------------------------------------------------------------- the PDF itself
@pytest.fixture
def pdf(tmp_path, monkeypatch):
    monkeypatch.setattr(pdf_service, "REPORT_DIR", tmp_path)
    extra = {
        "whois": {"registrar": "Example Registrar", "creation_date": "1995-08-14", "expiration_date": "2030-01-01"},
        "dns": {"A": ["93.184.216.34"], "AAAA": [], "MX": ["0 ."], "NS": ["a.iana-servers.net."]},
        "ssl": {"issuer": [[["organizationName", "DigiCert Inc"]]], "subject": [[["commonName", "www.example.org"]]],
                "not_before": "Jan 30 2025", "not_after": "Mar  1 2026"},
    }
    report = make_report(extra=extra)
    return generate_pdf(report, 7)


def test_pdf_has_all_eight_sections_in_order(pdf):
    text = pdf_text(pdf)
    headings = ["1. Executive summary", "2. Risk assessment", "3. Open ports and services", "4. Vulnerabilities",
                "5. Asset information", "6. Recommendations", "7. Conclusion", "8. Scope and limitations"]
    positions = [text.index(h) for h in headings]
    assert positions == sorted(positions)


def test_pdf_contains_the_findings(pdf):
    text = pdf_text(pdf)
    for needle in ["example.com", "Scan ID", "CVE-2021-41773", "Apache httpd", "Open port Telnet (23)", "Telnet is unencrypted",
                   "Example Registrar", "93.184.216.34", "O=DigiCert Inc", "CN=www.example.org", "Page 1"]:
        assert needle in text, needle
    assert "Total (capped at 100)" in text


def test_pdf_filename_comes_from_the_scan_id_never_from_the_target(tmp_path, monkeypatch):
    monkeypatch.setattr(pdf_service, "REPORT_DIR", tmp_path)
    report = make_report(target="../../etc/passwd")
    path = generate_pdf(report, 99)
    assert pathlib.Path(path).parent == tmp_path and pathlib.Path(path).name == "scan_99.pdf"


def test_pdf_treats_hostile_banner_text_as_plain_text(tmp_path, monkeypatch):
    monkeypatch.setattr(pdf_service, "REPORT_DIR", tmp_path)
    ports = [{"port": 8080, "protocol": "tcp", "state": "open", "service": "http",
              "product": "<b>BOLD</b><script>x</script> & \u2603", "version": "1.0"}]
    text = pdf_text(generate_pdf(make_report(ports=ports), 3))
    assert "<b>BOLD</b>" in text and "<script>x</script>" in text  # shown literally, not interpreted


def test_pdf_for_an_ip_target_without_asset_data_still_builds(tmp_path, monkeypatch):
    monkeypatch.setattr(pdf_service, "REPORT_DIR", tmp_path)
    text = pdf_text(generate_pdf(make_report(target="93.184.216.34"), 5))
    assert "No domain, DNS or certificate information was available" in text


def test_a_long_report_spans_pages_without_crashing(tmp_path, monkeypatch):
    monkeypatch.setattr(pdf_service, "REPORT_DIR", tmp_path)
    many = [{"port": 1000 + i, "protocol": "tcp", "state": "open", "service": "x", "product": "Product " * 6, "version": "1"}
            for i in range(120)]
    path = generate_pdf(make_report(ports=many), 8)
    assert len(PdfReader(path).pages) >= 3


# ---------------------------------------------- a low score must never hide an urgent finding
def _open(port, product=None, version=None, service="x"):
    return {"port": port, "protocol": "tcp", "state": "open", "service": service, "product": product, "version": version}


def test_low_score_with_a_high_priority_recommendation_says_so_in_summary_and_conclusion(tmp_path, monkeypatch):
    monkeypatch.setattr(pdf_service, "REPORT_DIR", tmp_path)
    report = make_report(ports=[_open(6379, service="redis")])   # exposed Redis: scoring model gives 0, advice says High
    assert report["executive_summary"]["risk_level"] == "LOW"
    summary = " ".join(build_executive_summary(report))
    assert "Although the overall score is low, 1 finding is rated High priority" in summary
    assert "No urgent action" not in summary                      # no contradiction
    text = pdf_text(generate_pdf(report, 11))
    assert text.count("Although the overall score is low") == 2   # executive summary AND conclusion


def test_critical_wins_over_high_in_the_wording():
    report = make_report(ports=[_open(23, service="telnet"), _open(21, service="ftp")])   # 10 + 10 = 20 -> MEDIUM
    assert report["executive_summary"]["risk_level"] == "MEDIUM"
    summary = " ".join(build_executive_summary(report))
    assert "Although the overall score is medium, 2 findings are rated Critical priority" in summary


def test_a_clean_or_high_risk_report_keeps_the_standard_wording():
    assert "No urgent action is needed" in " ".join(build_executive_summary(make_report(ports=[])))
    assert "Prioritise fixing" in " ".join(build_executive_summary(make_report()))   # HIGH score
    low_without_urgent = make_report(ports=[_open(443, service="https")])             # only a Low-priority hint
    assert "No urgent action is needed" in " ".join(build_executive_summary(low_without_urgent))
