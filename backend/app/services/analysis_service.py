"""SOC-style analysis of one completed scan.

Everything here is derived from the findings the scanner really produced (open ports, service
versions, matched CVEs, risk factors, DNS/WHOIS/TLS data). Nothing is invented. The same
structure feeds the dashboard panels, and its text is reused by the Security Copilot.

Pure functions work on plain dicts so they can be tested without a database;
`analysis_for_scan` is the one function that touches the database (to find the previous scan).
"""
import ssl
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.scan import Scan
from app.services.agents import agent_states
from app.services.pdf_service import build_executive_summary, collect_recommendations, dn_to_text
from app.services.recommendation_engine import PORT_ADVICE
from app.services.report_service import generate_report
from app.services.risk_engine import PORT_NAMES

SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}
_RISK_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
_LEVEL_SEVERITY = {"LOW": "low", "MEDIUM": "medium", "HIGH": "high", "CRITICAL": "critical"}

# (minimum health score, grade), best first
GRADES = ((97, "A+"), (93, "A"), (90, "A-"), (87, "B+"), (83, "B"), (80, "B-"),
          (77, "C+"), (73, "C"), (70, "C-"), (60, "D"), (0, "F"))

# Alert risk score when there is no CVSS number to use
_DEFAULT_ALERT_SCORE = {"critical": 90, "high": 75, "medium": 50}


# --------------------------------------------------------------------------- scoring helpers
def health_score(risk_score: int | None) -> int:
    """Security health is the inverse of the risk score: 0 risk = 100% healthy."""
    return max(0, min(100, 100 - int(risk_score or 0)))


def grade_for(health: int) -> str:
    return next(grade for minimum, grade in GRADES if health >= minimum)


def severity_from_priority(priority: str | None) -> str:
    return {"critical": "critical", "immediate": "critical", "high": "high",
            "medium": "medium", "low": "low"}.get(str(priority or "").lower(), "info")


def _cve_severity(value: str | None) -> str:
    v = str(value or "").lower()
    return v if v in ("critical", "high", "medium", "low") else "medium"


# --------------------------------------------------------------------------- port classification
_CATEGORY_BY_PORT = {
    22: "remote_access", 23: "remote_access", 3389: "remote_access", 5900: "remote_access",
    21: "file_transfer", 445: "file_sharing", 139: "file_sharing", 2049: "file_sharing",
    80: "web", 443: "web", 8000: "web", 8080: "web", 8443: "web",
    25: "mail", 110: "mail", 143: "mail", 465: "mail", 587: "mail", 993: "mail", 995: "mail",
    53: "dns", 3306: "database", 5432: "database", 1433: "database", 1521: "database",
    27017: "database", 6379: "database", 9200: "database", 161: "management", 389: "directory", 636: "directory",
}
CATEGORY_NOTES = {
    "remote_access": "Possible entry point: remote administration",
    "web": "Web attack surface: application and server flaws",
    "database": "Exposed data store: should not be reachable from outside",
    "file_transfer": "File-transfer surface: credential and data exposure",
    "file_sharing": "File-sharing surface: credential and data exposure",
    "mail": "Mail surface: relay abuse and phishing",
    "dns": "Name service: amplification and information leakage",
    "management": "Management interface: information disclosure",
    "directory": "Directory service: account enumeration",
    "other": "Open service",
}


def port_category(port: int) -> str:
    return _CATEGORY_BY_PORT.get(port, "other")


def _service_name(entry: dict) -> str:
    number = entry.get("port")
    return PORT_NAMES.get(number) or str(entry.get("service") or "unknown")


def _product_text(entry: dict) -> str:
    return " ".join(str(x) for x in (entry.get("product"), entry.get("version")) if x)


# --------------------------------------------------------------------------- TLS expiry
def _tls_expiry_days(ssl_info: dict | None, scanned_at: str | None) -> int | None:
    """Days between the scan and certificate expiry (negative = already expired); None if unknown."""
    if not ssl_info or ssl_info.get("error") or not ssl_info.get("not_after"):
        return None
    try:
        expires = ssl.cert_time_to_seconds(str(ssl_info["not_after"]))
        if scanned_at:
            scan_time = datetime.strptime(scanned_at.replace(" UTC", ""), "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        else:
            scan_time = datetime.now(timezone.utc)
        return int((expires - scan_time.timestamp()) // 86400)
    except (ValueError, TypeError):
        return None


# --------------------------------------------------------------------------- findings / alerts
def _build_findings(details: dict) -> tuple[list[dict], list[dict]]:
    """(findings, alerts). Alerts are the findings of severity medium or higher."""
    services = details.get("services") or [
        {"port": p.get("port"), "service": p.get("service"), "product": p.get("product"),
         "version": p.get("version"), "cves": []} for p in (details.get("ports") or [])
    ]
    findings: list[dict] = []
    seen_cves: set[str] = set()

    for entry in services:
        number = entry.get("port")
        advice = PORT_ADVICE.get(number)
        product = _product_text(entry)
        if advice:
            findings.append({
                "id": f"port:{number}", "severity": severity_from_priority(advice[0]), "port": number,
                "title": f"Exposed {_service_name(entry)} service detected on port {number}",
                "detail": advice[1] + (f" Detected: {product}." if product else ""),
                "action": advice[1],
            })
        else:
            findings.append({
                "id": f"port:{number}", "severity": "info", "port": number,
                "title": f"Open port {number} ({entry.get('service') or 'unknown service'})",
                "detail": "No specific risk identified for this service." + (f" Detected: {product}." if product else ""),
                "action": None,
            })

        for cve in entry.get("cves") or []:
            if cve.get("cve") in seen_cves:
                continue
            seen_cves.add(cve["cve"])
            severity = _cve_severity(cve.get("severity"))
            cvss = cve.get("cvss")
            findings.append({
                "id": f"cve:{cve['cve']}", "severity": severity, "port": number, "cve": cve["cve"],
                "title": f"{cve['cve']}: {cve.get('description', 'known vulnerability')}",
                "detail": f"Matched on port {number} running {product or 'an unidentified service'}"
                          + (f" (CVSS {cvss})" if cvss is not None else "") + ".",
                "action": (f"Upgrade or patch {entry.get('product') or 'the affected service'} immediately."
                           if severity in ("critical", "high")
                           else f"Schedule a patch for {entry.get('product') or 'the affected service'}."),
                "risk_score": round(float(cvss) * 10) if isinstance(cvss, (int, float)) else None,
            })

    days = _tls_expiry_days(details.get("ssl"), details.get("scanned_at"))
    if days is not None and days < 0:
        findings.append({"id": "tls:cert", "severity": "high", "port": 443, "title": "TLS certificate has expired",
                         "detail": f"The certificate expired {-days} day{'s' if days != -1 else ''} before this scan.",
                         "action": "Renew and deploy a valid TLS certificate."})
    elif days is not None and days <= 30:
        findings.append({"id": "tls:cert", "severity": "medium", "port": 443,
                         "title": f"TLS certificate expires in {days} day{'s' if days != 1 else ''}",
                         "detail": "An expired certificate breaks HTTPS and trains users to ignore warnings.",
                         "action": "Renew the certificate before it expires."})

    if not details.get("vulnerabilities"):
        findings.append({"id": "info:no-cve", "severity": "info", "port": None,
                         "title": "No known vulnerabilities matched the detected versions",
                         "detail": "AegisAI matches versions against a built-in CVE list; a clean result is not proof of safety.",
                         "action": None})

    findings.sort(key=lambda f: (-SEVERITY_RANK[f["severity"]], f["id"]))

    alerts = []
    for f in findings:
        if SEVERITY_RANK[f["severity"]] < SEVERITY_RANK["medium"]:
            continue
        alerts.append({
            "id": f["id"], "severity": f["severity"], "title": f["title"], "detail": f["detail"],
            "risk_score": f.get("risk_score") or _DEFAULT_ALERT_SCORE[f["severity"]],
            "action": f.get("action") or "Review this finding.", "port": f.get("port"), "cve": f.get("cve"),
        })
    return findings, alerts


# --------------------------------------------------------------------------- attack surface
def _build_surface(details: dict, findings: list[dict]) -> dict:
    target = details.get("target", "target")
    level = (details.get("risk") or {}).get("level", "LOW")
    nodes = [{"id": "target", "label": target, "kind": "target", "port": None,
              "severity": _LEVEL_SEVERITY.get(level, "low"), "note": "Scanned target", "detail": f"Overall risk {level}"}]
    edges: list[dict] = []

    worst_by_port: dict[int, str] = {}
    for f in findings:
        if f.get("port") is not None and SEVERITY_RANK[f["severity"]] > SEVERITY_RANK[worst_by_port.get(f["port"], "info")]:
            worst_by_port[f["port"]] = f["severity"]

    services = details.get("services") or []
    for entry in sorted(services, key=lambda e: e.get("port") or 0):
        number = entry["port"]
        category = port_category(number)
        node_id = f"port-{number}"
        nodes.append({"id": node_id, "label": f"{_service_name(entry)} {number}", "kind": category, "port": number,
                      "severity": worst_by_port.get(number, "info"), "note": CATEGORY_NOTES[category],
                      "detail": _product_text(entry) or str(entry.get("service") or "unidentified service")})
        edges.append({"source": "target", "target": node_id})
        for cve in entry.get("cves") or []:
            cve_id = f"cve-{cve['cve']}-{number}"
            nodes.append({"id": cve_id, "label": cve["cve"], "kind": "vulnerability", "port": number,
                          "severity": _cve_severity(cve.get("severity")), "note": "Known vulnerability",
                          "detail": cve.get("description", "")})
            edges.append({"source": node_id, "target": cve_id})

    dns_info = details.get("dns") or {}
    dns_nodes = 0
    for record in ("A", "AAAA", "MX", "NS"):
        for value in (dns_info.get(record) or [])[:2]:
            if dns_nodes >= 6:
                break
            dns_nodes += 1
            node_id = f"dns-{record}-{dns_nodes}"
            nodes.append({"id": node_id, "label": f"{record} {str(value)[:28]}", "kind": "dns", "port": None,
                          "severity": "info", "note": "DNS record", "detail": f"{record} record: {value}"})
            edges.append({"source": "target", "target": node_id})

    ssl_info = details.get("ssl") or {}
    if ssl_info and not ssl_info.get("error"):
        tls_severity = next((f["severity"] for f in findings if f["id"] == "tls:cert"), "info")
        nodes.append({"id": "tls", "label": "TLS certificate", "kind": "tls", "port": 443, "severity": tls_severity,
                      "note": "Certificate", "detail": f"Issuer: {dn_to_text(ssl_info.get('issuer'))}"})
        edges.append({"source": "target", "target": "tls"})

    return {"nodes": nodes, "edges": edges}


# --------------------------------------------------------------------------- executive view
def _business_risk(level: str, alerts: list[dict]) -> str:
    """The technical level, raised when an alert is more serious than the score suggests."""
    worst = max((a["severity"] for a in alerts), key=lambda s: SEVERITY_RANK[s], default=None)
    floor = {"critical": "HIGH", "high": "MEDIUM"}.get(worst or "", "LOW")
    return max(level, floor, key=_RISK_ORDER.index)


def _executive(details: dict, findings: list[dict], recommendations: list[dict], alerts: list[dict]) -> dict:
    level = (details.get("risk") or {}).get("level", "LOW")
    actionable = [f for f in findings if f["severity"] != "info"]
    critical = sum(1 for f in actionable if f["severity"] == "critical")
    business = _business_risk(level, alerts)

    if not actionable:
        statement = (f"{details.get('target')} shows no security issues that need action. "
                     "Keep systems patched and re-scan regularly.")
    else:
        n = len(actionable)
        statement = (f"{details.get('target')} currently presents {business.lower()} business risk. "
                     f"{n} issue{'s need' if n != 1 else ' needs'} attention"
                     + (f", including {critical} critical" if critical else "") + ". "
                     + (f"Recommended next step: {recommendations[0]['text']}" if recommendations else ""))
    return {"business_risk": business, "technical_findings": len(actionable), "critical_issues": critical,
            "recommended_actions": len(recommendations), "statement": statement.strip()}


# --------------------------------------------------------------------------- public API
def build_analysis(details: dict, *, scan_id: int, previous_risk: int | None = None,
                   previous_scan_id: int | None = None) -> dict:
    """The full analysis of one completed scan (see module docstring)."""
    risk = details.get("risk") or {"score": 0, "level": "LOW"}
    findings, alerts = _build_findings(details)

    report = generate_report(details)
    recommendations = [
        {"priority": r["priority"], "text": r["recommendation"], "applies_to": r["source"]}
        for r in collect_recommendations(report)
    ]

    health = health_score(risk["score"])
    previous_health = health_score(previous_risk) if previous_risk is not None else None

    return {
        "scan_id": scan_id,
        "target": details.get("target"),
        "scanned_at": details.get("scanned_at"),
        "analyst": {
            "title": "AegisAI Analyst Report",
            "target": details.get("target"),
            "security_score": health,
            "risk_score": risk["score"],
            "risk_level": risk["level"],
            "summary": " ".join(build_executive_summary(report)),
            "findings": findings,
            "recommendations": recommendations,
        },
        "health": {
            "score": health,
            "grade": grade_for(health),
            "previous_score": previous_health,
            "previous_scan_id": previous_scan_id,
            "delta": (health - previous_health) if previous_health is not None else None,
        },
        "executive": _executive(details, findings, recommendations, alerts),
        "alerts": alerts,
        "surface": _build_surface(details, findings),
        "agents": agent_states("completed", 100),
    }


def analysis_for_scan(db: Session, scan: Scan) -> dict:
    """Analysis of a completed scan, compared with the previous completed scan of the same target."""
    details = dict(scan.result or {})
    details.setdefault("target", scan.target)
    details.setdefault("risk", scan.risk or {"score": 0, "level": "LOW"})
    if scan.created_at and "scanned_at" not in details:
        details["scanned_at"] = scan.created_at.strftime("%Y-%m-%d %H:%M:%S UTC")

    previous = (
        db.query(Scan)
        .filter(Scan.user_id == scan.user_id, Scan.target == scan.target, Scan.status == "completed",
                Scan.id < scan.id, Scan.risk_score.isnot(None))
        .order_by(Scan.id.desc())
        .first()
    )
    return build_analysis(details, scan_id=scan.id,
                          previous_risk=previous.risk_score if previous else None,
                          previous_scan_id=previous.id if previous else None)
