import json
from typing import Callable, Optional

from app.core.logger import logger
from app.scanners.validator import assert_scannable
from app.services.asset_service import collect_asset_info
from app.services.pdf_service import generate_pdf
from app.services.report_service import generate_report
from app.services.risk_engine import calculate_risk
from app.services.scan_engine import execute_scan
from app.services.vulnerability_service import analyze_services

ProgressCallback = Callable[[int, str], None]


def _json_safe(value):
    """WHOIS/SSL results contain sets and datetimes; make them storable as JSON."""
    return json.loads(json.dumps(value, default=str))


def start_scan(target: str, scan_id: int, on_progress: Optional[ProgressCallback] = None) -> dict:
    """Run the full pipeline for one scan. Persisting results is the caller's job."""
    progress = on_progress or (lambda pct, msg: None)

    # Re-validate here (not only in the API): the worker is a second trust
    # boundary and the DNS answer may have changed since the request was made.
    scan_target = assert_scannable(target)
    logger.info(f"Starting scan {scan_id}: {scan_target.host} ({scan_target.ip})")

    progress(20, "Scanning ports and services")
    # Scan the address we validated, not the name, so a DNS change between the
    # check and the scan can't redirect Nmap to an internal host.
    ports = execute_scan(scan_target.ip)
    logger.info(f"Scan {scan_id}: {len(ports)} open ports")

    progress(50, "Collecting WHOIS, DNS and SSL data")
    assets = collect_asset_info(scan_target.host, scan_target.kind)

    progress(70, "Analysing services and vulnerabilities")
    services, vulnerabilities = analyze_services(scan_target.ip, ports)
    risk = calculate_risk(ports, vulnerabilities)
    logger.info(f"Scan {scan_id}: risk {risk}, {len(vulnerabilities)} vulnerabilities")

    progress(90, "Generating report")
    details = {
        "target": scan_target.host,
        "status": "completed",
        "risk": risk,
        **assets,
        "ports": ports,
        "services": services,
        "vulnerabilities": vulnerabilities,
    }
    report = generate_report(details)
    pdf_path = generate_pdf(report, scan_id)

    return {"risk": risk, "details": _json_safe(details), "pdf": pdf_path}
