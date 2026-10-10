from datetime import datetime, timezone


def generate_report(scan_result: dict) -> dict:
    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "executive_summary": {
            "target": scan_result["target"],
            "status": scan_result["status"],
            "risk_level": scan_result["risk"]["level"],
            "risk_score": scan_result["risk"]["score"],
        },
        "whois": scan_result.get("whois"),
        "dns": scan_result.get("dns"),
        "ssl": scan_result.get("ssl"),
        "ports": scan_result.get("ports"),
        "services": scan_result.get("services"),
        "vulnerabilities": scan_result.get("vulnerabilities"),
        "recommendation": (
            "Apply patches, close unused ports, update outdated software and "
            "follow the per-service recommendations above."
        ),
    }
