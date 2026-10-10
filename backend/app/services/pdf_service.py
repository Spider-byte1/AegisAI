from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# <backend>/app/reports, independent of the process working directory.
REPORT_DIR = Path(__file__).resolve().parent.parent / "reports"


def _table(rows, col_widths=None):
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0e7490")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def generate_pdf(report: dict, scan_id: int) -> str:
    """Write the PDF to reports/scan_<id>.pdf (never from user-supplied names)."""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    path = REPORT_DIR / f"scan_{scan_id}.pdf"

    styles = getSampleStyleSheet()
    body = styles["BodyText"]
    summary = report["executive_summary"]

    # reportlab Paragraphs parse markup, so everything user/remote-supplied is escaped.
    def p(text):
        return Paragraph(escape(str(text)), body)

    story = [
        Paragraph("AegisAI Vulnerability Assessment Report", styles["Title"]),
        Paragraph(f"<b>Target:</b> {escape(str(summary['target']))}", body),
        Paragraph(f"<b>Generated:</b> {escape(str(report['generated_at']))}", body),
        Paragraph(f"<b>Risk level:</b> {escape(str(summary['risk_level']))} "
                  f"(score {summary['risk_score']}/100)", body),
        Spacer(1, 12),
        Paragraph("Open ports and services", styles["Heading2"]),
    ]

    services = report.get("services") or []
    if services:
        rows = [["Port", "Service", "Product", "Version"]]
        for s in services:
            rows.append([p(s["port"]), p(s.get("service") or "-"), p(s.get("product") or "-"), p(s.get("version") or "-")])
        story.append(_table(rows, [50, 100, 190, 100]))
    else:
        story.append(Paragraph("No open ports were found.", body))

    story += [Spacer(1, 12), Paragraph("Vulnerabilities", styles["Heading2"])]
    vulns = report.get("vulnerabilities") or []
    if vulns:
        rows = [["CVE", "Severity", "CVSS", "Description"]]
        for v in vulns:
            rows.append([p(v["cve"]), p(v["severity"]), p(v.get("cvss", "-")), p(v["description"])])
        story.append(_table(rows, [85, 60, 40, 255]))
    else:
        story.append(Paragraph("No known vulnerabilities matched the detected service versions.", body))

    story += [Spacer(1, 12), Paragraph("Recommendations", styles["Heading2"])]
    recs = [r for s in services for r in s.get("recommendations", [])]
    if recs:
        for r in recs:
            story.append(Paragraph(f"<b>{escape(r['priority'])}:</b> {escape(r['recommendation'])}", body))
    else:
        story.append(p(report["recommendation"]))

    SimpleDocTemplate(str(path)).build(story)
    return str(path)
