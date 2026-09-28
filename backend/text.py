from app.services.risk_service import generate_risk_report

scan_result = {
    "ports": [22, 80, 443],
    "vulnerabilities": ["Open SSH", "Weak TLS"]
}

report = generate_risk_report(scan_result)

print(report)