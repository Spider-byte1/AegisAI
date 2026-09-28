from app.services.risk_engine import calculate_risk

def generate_risk_report(scan_result):
    """
    Generates a risk report based on scan results.
    Expected format:
    {
        "ports": [22, 80, 443],
        "vulnerabilities": ["Open SSH", "Weak TLS"]
    }
    """

    return calculate_risk(
        scan_result["ports"],
        scan_result["vulnerabilities"]
    )