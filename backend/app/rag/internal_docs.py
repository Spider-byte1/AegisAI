"""Knowledge about AegisAI itself, generated from the real constants."""
from app.services.cve_database import CVE_DATABASE
from app.services.risk_engine import LEVEL_THRESHOLDS, RISKY_PORTS, SEVERITY_POINTS

_PORT_NAMES = {21: "FTP", 22: "SSH", 23: "Telnet", 80: "HTTP", 443: "HTTPS"}


def aegisai_overview_markdown() -> str:
    ports = ", ".join(
        f"port {p} ({_PORT_NAMES.get(p, 'service')}) adds {pts}" for p, pts in sorted(RISKY_PORTS.items())
    )
    severities = ", ".join(f"{name} {pts}" for name, pts in SEVERITY_POINTS.items())
    levels = ", ".join(f"{name} from {minimum}" for name, minimum in LEVEL_THRESHOLDS)
    products = ", ".join(sorted(CVE_DATABASE))
    cve_count = sum(len(v) for v in CVE_DATABASE.values())

    return f"""# How AegisAI Works

## Scan pipeline
When you start a scan, AegisAI checks the target (a single domain or IP address; private, loopback and link-local addresses are blocked unless the lab setting allows them), queues a background job, runs Nmap service detection against the validated IP address, collects WHOIS, DNS and SSL data for domains, matches detected product versions against a built-in CVE table, calculates a risk score and generates a PDF report. You must confirm you are authorised to scan the target before a scan starts.

## Risk score and risk levels
The AegisAI risk score starts at 0 and is capped at 100. Only open ports count, and only some are on the risky list: {ports} points. Each matched vulnerability adds points by severity: {severities}. The score maps to a risk level: {levels}; anything lower is LOW. Closed and filtered ports do not add to the score.

## CVE matching
The built-in table covers {cve_count} CVEs across these products: {products}. A CVE is only reported when the product matches and the detected version falls inside the affected range. If Nmap cannot detect a version, nothing is reported, so a clean result does not prove that a host is safe.

## Limits of AegisAI scans
Version-based matching can produce false positives (for example when a distribution backports a fix without changing the version number) and false negatives (vulnerabilities not in the small built-in table). By default Nmap checks the 1000 most common TCP ports, so services on other ports and on UDP are not seen. AegisAI is an assessment aid and not a substitute for a penetration test.
"""
