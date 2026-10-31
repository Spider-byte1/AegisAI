from datetime import datetime, timezone

from app.services.recommendation_engine import port_recommendations
from app.services.risk_engine import risk_factors


def generate_report(scan_result: dict) -> dict:
    ports = scan_result.get("ports") or []
    return {
        "generated_at": scan_result.get("scanned_at") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "executive_summary": {
            "target": scan_result["target"],
            "status": scan_result["status"],
            "risk_level": scan_result["risk"]["level"],
            "risk_score": scan_result["risk"]["score"],
        },
        # Scans saved by older versions have no stored breakdown; rebuild it from the saved findings.
        "risk_factors": scan_result.get("risk_factors") or risk_factors(ports, scan_result.get("vulnerabilities")),
        "whois": scan_result.get("whois"),
        "dns": scan_result.get("dns"),
        "ssl": scan_result.get("ssl"),
        "ports": ports,
        "services": scan_result.get("services"),
        "vulnerabilities": scan_result.get("vulnerabilities"),
        "port_recommendations": port_recommendations(ports),
        "recommendation": (
            "Apply patches, close unused ports, update outdated software and "
            "follow the per-service recommendations above."
        ),
    }
