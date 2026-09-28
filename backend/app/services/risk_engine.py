def calculate_risk(ports, vulnerabilities=None):

    risk_score = 0

    # Port based risk
    for port in ports:
        if isinstance(port, dict):
            port_number = port.get("port")

            if port_number in [21, 23, 80]:
                risk_score += 10

            elif port_number in [22, 443]:
                risk_score += 5


    # Vulnerability based risk
    if vulnerabilities:
     for vuln in vulnerabilities:

        if isinstance(vuln, dict):
            severity = vuln.get("severity", "").lower()

        else:
            severity = str(vuln).lower()


        if "critical" in severity:
            risk_score += 40

        elif "high" in severity:
            risk_score += 25

        elif "medium" in severity:
            risk_score += 15


    # Final rating
    if risk_score >= 70:
        level = "CRITICAL"

    elif risk_score >= 40:
        level = "HIGH"

    elif risk_score >= 20:
        level = "MEDIUM"

    else:
        level = "LOW"


    return {
        "score": risk_score,
        "level": level
    }