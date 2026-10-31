"""PDF summary report for one scan.

Sections: 1 Executive summary, 2 Risk assessment, 3 Open ports and services,
4 Vulnerabilities, 5 Asset information, 6 Recommendations, 7 Conclusion,
8 Scope and limitations.

Everything shown can contain text that came from remote servers (banners, WHOIS,
certificates), so it is escaped for reportlab's markup and reduced to characters the
built-in PDF fonts can draw.
"""
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.services.risk_engine import RISKY_PORTS, port_label

# <backend>/app/reports, independent of the process working directory.
REPORT_DIR = Path(__file__).resolve().parent.parent / "reports"

LEVEL_COLORS = {
    "LOW": "#15803d",
    "MEDIUM": "#b45309",
    "HIGH": "#c2410c",
    "CRITICAL": "#b91c1c",
}
_SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}
_PRIORITY_ORDER = {"critical": 0, "immediate": 0, "high": 1, "medium": 2, "low": 3, "unknown": 4}

_ACTION_BY_LEVEL = {
    "LOW": "No urgent action is needed. Keep software patched and review the recommendations in this report.",
    "MEDIUM": "Plan to fix the findings in this report during the next maintenance window.",
    "HIGH": "Prioritise fixing the findings in this report soon, starting with the most severe.",
    "CRITICAL": "Act immediately: fix or isolate the affected services first, then work through the rest of the findings in this report.",
}


# --------------------------------------------------------------------------- text helpers
def clean(value) -> str:
    """Plain text safe for the built-in PDF fonts (no markup, no characters they cannot draw)."""
    text = "-" if value is None else str(value)
    return text.encode("latin-1", "replace").decode("latin-1")


def _dn_pairs(node, out):
    """Certificate names arrive as nested lists of [key, value] pairs; collect them in order."""
    if isinstance(node, (list, tuple)):
        if len(node) == 2 and all(isinstance(x, str) for x in node):
            out.append((node[0], node[1]))
        else:
            for child in node:
                _dn_pairs(child, out)


_DN_SHORT = {"commonName": "CN", "organizationName": "O", "countryName": "C", "organizationalUnitName": "OU"}


def dn_to_text(dn) -> str:
    """[[["countryName","US"]],[["organizationName","Example"]]] -> 'C=US, O=Example'."""
    pairs: list = []
    _dn_pairs(dn, pairs)
    if not pairs:
        return clean(dn) if dn else "-"
    return ", ".join(f"{_DN_SHORT.get(k, k)}={v}" for k, v in pairs)


def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(v) for v in value]
    return [str(value)]


def _urgent_recommendations(report: dict) -> list[dict]:
    return [r for r in collect_recommendations(report)
            if str(r.get("priority", "")).lower() in ("critical", "immediate", "high")]


def action_text(report: dict) -> str:
    """The closing 'what to do' sentence. A low or medium score must never hide a High or
    Critical recommendation (the scoring model only knows a few risky ports)."""
    level = report["executive_summary"]["risk_level"]
    urgent = _urgent_recommendations(report)
    if urgent and level in ("LOW", "MEDIUM"):
        worst = "Critical" if any(str(r["priority"]).lower() in ("critical", "immediate") for r in urgent) else "High"
        n = len(urgent)
        return (f"Although the overall score is {level.lower()}, {n} finding{'s are' if n != 1 else ' is'} rated "
                f"{worst} priority in the Recommendations section and should be addressed first.")
    return _ACTION_BY_LEVEL.get(level, _ACTION_BY_LEVEL["LOW"])


def build_executive_summary(report: dict) -> list[str]:
    """Plain-language paragraphs for non-technical readers."""
    summary = report["executive_summary"]
    ports = report.get("ports") or []
    vulns = report.get("vulnerabilities") or []
    level = summary["risk_level"]

    paragraphs = [
        f"AegisAI assessed {summary['target']} on {report['generated_at']}. "
        f"The overall risk rating is {level} (score {summary['risk_score']} out of 100)."
    ]

    risky = [port_label(p["port"]) for p in ports if p.get("port") in RISKY_PORTS]
    if not ports:
        paragraphs.append("No open ports were found among the ports scanned.")
    else:
        sentence = f"{len(ports)} open port{'s' if len(ports) != 1 else ''} {'were' if len(ports) != 1 else 'was'} found"
        if risky:
            sentence += f", including commonly targeted services: {', '.join(risky)}"
        paragraphs.append(sentence + ".")

    if not vulns:
        paragraphs.append("No known vulnerabilities matched the detected software versions.")
    else:
        worst = max(vulns, key=lambda v: _SEVERITY_ORDER.get(str(v.get("severity", "")).lower(), 0))
        paragraphs.append(
            f"{len(vulns)} known vulnerabilit{'ies' if len(vulns) != 1 else 'y'} matched the detected software versions; "
            f"the most severe is {worst.get('cve')} ({worst.get('severity')})."
        )

    paragraphs.append(action_text(report))
    return paragraphs


def collect_recommendations(report: dict) -> list[dict]:
    """CVE-specific and port-specific advice, most urgent first, without repeats."""
    items, seen = [], set()
    for service in report.get("services") or []:
        for rec in service.get("recommendations") or []:
            items.append({**rec, "source": f"Port {service.get('port')}"})
    for rec in report.get("port_recommendations") or []:
        items.append({**rec, "source": f"Port {rec.get('port')}"})

    unique = []
    for item in items:
        key = (item.get("priority"), item.get("recommendation"))
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return sorted(unique, key=lambda r: _PRIORITY_ORDER.get(str(r.get("priority", "")).lower(), 4))


# --------------------------------------------------------------------------- PDF building
def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("t", parent=base["Title"], fontSize=20, textColor=colors.HexColor("#0e7490"), spaceAfter=4),
        "sub": ParagraphStyle("s", parent=base["BodyText"], textColor=colors.grey, fontSize=9, alignment=1, spaceAfter=10),
        "h": ParagraphStyle("h", parent=base["Heading2"], fontSize=13, textColor=colors.HexColor("#0e7490"), spaceBefore=12, spaceAfter=6),
        "body": ParagraphStyle("b", parent=base["BodyText"], fontSize=10, leading=14),
        "cell": ParagraphStyle("c", parent=base["BodyText"], fontSize=8.5, leading=11),
        "head": ParagraphStyle("hc", parent=base["BodyText"], fontSize=8.5, leading=11, textColor=colors.white, fontName="Helvetica-Bold"),
        "small": ParagraphStyle("sm", parent=base["BodyText"], fontSize=8.5, leading=11, textColor=colors.HexColor("#444444")),
    }


def _table(header, rows, col_widths, styles):
    data = [[Paragraph(escape(clean(h)), styles["head"]) for h in header]]
    for row in rows:
        data.append([Paragraph(escape(clean(c)), styles["cell"]) for c in row])
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0e7490")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#94a3b8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return table


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.grey)
    canvas.drawString(20 * mm, 12 * mm, "AegisAI - authorized security assessment - confidential")
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


def generate_pdf(report: dict, scan_id: int) -> str:
    """Write the PDF to reports/scan_<id>.pdf (never from user-supplied names)."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / f"scan_{scan_id}.pdf"

    st = _styles()
    summary = report["executive_summary"]
    level = summary["risk_level"]
    width = A4[0] - 40 * mm  # usable width

    def heading(n, text):
        return Paragraph(f"{n}. {escape(text)}", st["h"])

    def para(text, style="body"):
        return Paragraph(escape(clean(text)), st[style])

    story = [
        Paragraph("AegisAI Security Assessment Report", st["title"]),
        para("Vulnerability assessment summary", "sub"),
    ]

    # header block
    info = Table(
        [
            [Paragraph("<b>Target</b>", st["cell"]), para(summary["target"], "cell"),
             Paragraph("<b>Scan ID</b>", st["cell"]), para(scan_id, "cell")],
            [Paragraph("<b>Scanned</b>", st["cell"]), para(report["generated_at"], "cell"),
             Paragraph("<b>Risk</b>", st["cell"]),
             Paragraph(f'<font color="{LEVEL_COLORS.get(level, "#000000")}"><b>{escape(level)}</b></font> '
                       f'({summary["risk_score"]}/100)', st["cell"])],
        ],
        colWidths=[width * 0.14, width * 0.40, width * 0.14, width * 0.32],
    )
    info.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#94a3b8")),
                              ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
                              ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story += [info]

    # 1 executive summary
    story.append(heading(1, "Executive summary"))
    for text in build_executive_summary(report):
        story += [para(text), Spacer(1, 4)]

    # 2 risk assessment
    story.append(heading(2, "Risk assessment"))
    factors = report.get("risk_factors") or []
    if factors:
        rows = [[f["factor"], f"+{f['points']}"] for f in factors]
        rows.append(["Total (capped at 100)", f"{summary['risk_score']}"])
        story.append(_table(["Factor", "Points"], rows, [width * 0.80, width * 0.20], st))
        story.append(Spacer(1, 3))
        story.append(para("Levels: LOW below 20, MEDIUM 20-39, HIGH 40-69, CRITICAL 70 and above.", "small"))
    else:
        story.append(para("No risk factors were identified, so the score is 0."))

    # 3 ports and services
    story.append(heading(3, "Open ports and services"))
    services = report.get("services") or []
    if services:
        rows = [[s["port"], s.get("protocol") or "-", s.get("service") or "-", s.get("product") or "-", s.get("version") or "-"]
                for s in services]
        story.append(_table(["Port", "Protocol", "Service", "Product", "Version"], rows,
                            [width * 0.10, width * 0.14, width * 0.18, width * 0.34, width * 0.24], st))
    else:
        story.append(para("No open ports were found."))

    # 4 vulnerabilities
    story.append(heading(4, "Vulnerabilities"))
    vulns = report.get("vulnerabilities") or []
    if vulns:
        rows = [[v["cve"], v["severity"], v.get("cvss", "-"), v["description"]] for v in vulns]
        story.append(_table(["CVE", "Severity", "CVSS", "Description"], rows,
                            [width * 0.20, width * 0.14, width * 0.09, width * 0.57], st))
    else:
        story.append(para("No known vulnerabilities matched the detected service versions."))

    # 5 asset information
    story.append(heading(5, "Asset information"))
    rows = []
    whois, dns_info, ssl_info = report.get("whois") or {}, report.get("dns") or {}, report.get("ssl") or {}
    if whois and not whois.get("error"):
        rows += [["Registrar", whois.get("registrar") or "-"],
                 ["Created", whois.get("creation_date") or "-"],
                 ["Expires", whois.get("expiration_date") or "-"]]
    for record in ("A", "AAAA", "MX", "NS"):
        if dns_info.get(record):
            rows.append([f"DNS {record}", ", ".join(_as_list(dns_info[record]))])
    if ssl_info and not ssl_info.get("error"):
        rows += [["TLS issuer", dn_to_text(ssl_info.get("issuer"))],
                 ["TLS subject", dn_to_text(ssl_info.get("subject"))],
                 ["TLS valid from", ssl_info.get("not_before") or "-"],
                 ["TLS valid until", ssl_info.get("not_after") or "-"]]
    if rows:
        story.append(_table(["Item", "Value"], rows, [width * 0.22, width * 0.78], st))
    else:
        story.append(para("No domain, DNS or certificate information was available for this target (for example, it is an IP address or does not serve TLS)."))

    # 6 recommendations
    story.append(heading(6, "Recommendations"))
    recs = collect_recommendations(report)
    if recs:
        rows = [[r["priority"], r["source"], r["recommendation"]] for r in recs]
        story.append(_table(["Priority", "Applies to", "What to do"], rows,
                            [width * 0.14, width * 0.16, width * 0.70], st))
    else:
        story.append(para(report["recommendation"]))

    # 7 conclusion, 8 scope and limitations
    story.append(heading(7, "Conclusion"))
    story.append(para(f"{summary['target']} has an overall {level.lower()} risk rating. " + action_text(report)))
    story.append(KeepTogether([
        heading(8, "Scope and limitations"),
        para("This report reflects one scan from AegisAI's network position at the time shown, covering the 1000 most common "
             "TCP ports. Vulnerabilities are matched on software name and version against a small built-in list, so results are "
             "potential matches: operating systems often back-port fixes without changing version numbers, and a clean result does not "
             "prove a system is secure. Confirm important findings manually. Only systems you own or have written permission to test "
             "should be scanned.", "small"),
    ]))

    SimpleDocTemplate(
        str(path), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
        title=f"AegisAI report - {clean(summary['target'])}", author="AegisAI",
    ).build(story, onFirstPage=_footer, onLaterPages=_footer)
    return str(path)
