RISKY_PORTS = {21: 10, 23: 10, 80: 10, 22: 5, 443: 5}
SEVERITY_POINTS = {"critical": 40, "high": 25, "medium": 15, "low": 5}
# (level, minimum score), checked from the top; anything lower is LOW.
LEVEL_THRESHOLDS = (("CRITICAL", 70), ("HIGH", 40), ("MEDIUM", 20))


_PORT_NAMES = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3", 143: "IMAP",
    443: "HTTPS", 445: "SMB", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL", 6379: "Redis", 27017: "MongoDB",
}


def port_label(port: int) -> str:
    name = _PORT_NAMES.get(port)
    return f"{name} ({port})" if name else str(port)


def risk_factors(ports, vulnerabilities=None) -> list[dict]:
    """Every point in the score, with the reason: [{"factor": ..., "points": ...}, ...]."""
    factors = []

    for port in ports or []:
        if isinstance(port, dict):
            if port.get("state", "open") != "open":
                continue
            number = port.get("port")
        else:
            number = port
        points = RISKY_PORTS.get(number, 0)
        if points:
            factors.append({"factor": f"Open port {port_label(number)}", "points": points})

    for vuln in vulnerabilities or []:
        severity = vuln.get("severity", "") if isinstance(vuln, dict) else str(vuln)
        cve = vuln.get("cve") if isinstance(vuln, dict) else None
        for name, points in SEVERITY_POINTS.items():
            if name in severity.lower():
                label = f"{cve} ({name.capitalize()})" if cve else f"{name.capitalize()} vulnerability"
                factors.append({"factor": f"Known vulnerability {label}", "points": points})
                break

    return factors


def calculate_risk(ports, vulnerabilities=None) -> dict:
    """Score open ports and CVE severities; returns {"score": 0-100, "level": ...}."""
    score = min(sum(f["points"] for f in risk_factors(ports, vulnerabilities)), 100)

    level = "LOW"
    for name, minimum in LEVEL_THRESHOLDS:
        if score >= minimum:
            level = name
            break

    return {"score": score, "level": level}
