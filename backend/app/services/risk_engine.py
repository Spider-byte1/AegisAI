RISKY_PORTS = {21: 10, 23: 10, 80: 10, 22: 5, 443: 5}
SEVERITY_POINTS = {"critical": 40, "high": 25, "medium": 15, "low": 5}
# (level, minimum score), checked from the top; anything lower is LOW.
LEVEL_THRESHOLDS = (("CRITICAL", 70), ("HIGH", 40), ("MEDIUM", 20))


def calculate_risk(ports, vulnerabilities=None) -> dict:
    """Score open ports and CVE severities; returns {"score": 0-100, "level": ...}."""
    score = 0

    for port in ports or []:
        if isinstance(port, dict):
            if port.get("state", "open") != "open":
                continue
            number = port.get("port")
        else:
            number = port
        score += RISKY_PORTS.get(number, 0)

    for vuln in vulnerabilities or []:
        severity = vuln.get("severity", "") if isinstance(vuln, dict) else str(vuln)
        severity = severity.lower()
        for name, points in SEVERITY_POINTS.items():
            if name in severity:
                score += points
                break

    score = min(score, 100)

    level = "LOW"
    for name, minimum in LEVEL_THRESHOLDS:
        if score >= minimum:
            level = name
            break

    return {"score": score, "level": level}
