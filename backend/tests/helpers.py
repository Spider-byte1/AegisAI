"""Shared builders for tests that need realistic scan data."""
import json

from app.database import SessionLocal
from app.models.scan import Scan
from app.services.risk_engine import calculate_risk, risk_factors
from app.services.vulnerability_service import analyze_services

OPEN = lambda port, service="x", product=None, version=None: {  # noqa: E731
    "port": port, "protocol": "tcp", "state": "open", "service": service, "product": product, "version": version}

SAMPLE_PORTS = [
    OPEN(80, "http", "Apache httpd", "2.4.49"),
    OPEN(23, "telnet"),
    OPEN(22, "ssh", "OpenSSH", "9.6p1"),
]

SAMPLE_ASSETS = {
    "whois": {"registrar": "Example Registrar", "creation_date": "1995-08-14", "expiration_date": "2030-01-01"},
    "dns": {"A": ["93.184.216.34"], "AAAA": [], "MX": ["0 ."], "NS": ["a.iana-servers.net."]},
    "ssl": {"issuer": [[["organizationName", "DigiCert Inc"]]], "subject": [[["commonName", "www.example.org"]]],
            "not_before": "Jan 30 00:00:00 2025 GMT", "not_after": "Jan  1 00:00:00 2031 GMT"},
}


def build_details(ports=None, target="example.com", scanned_at="2026-10-10 12:00:00 UTC", assets=None):
    ports = SAMPLE_PORTS if ports is None else ports
    services, vulns = analyze_services("93.184.216.34", ports)
    details = {
        "target": target, "status": "completed", "scanned_at": scanned_at,
        "risk": calculate_risk(ports, vulns), "risk_factors": risk_factors(ports, vulns),
        "ports": ports, "services": services, "vulnerabilities": vulns,
        **(SAMPLE_ASSETS if assets is None else assets),
    }
    return json.loads(json.dumps(details, default=str))


def insert_scan(user_id, details=None, target="example.com", status="completed", progress=100):
    """Put a scan row straight into the test database (no worker, no network)."""
    details = build_details(target=target) if details is None and status == "completed" else details
    db = SessionLocal()
    try:
        scan = Scan(
            user_id=user_id, target=target, status=status, progress=progress, message="",
            risk_score=(details or {}).get("risk", {}).get("score"), risk_level=(details or {}).get("risk", {}).get("level"),
            result=details,
        )
        db.add(scan)
        db.commit()
        return scan.id
    finally:
        db.close()
