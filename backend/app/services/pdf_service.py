from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
import os


def generate_pdf(report):

    os.makedirs("app/reports", exist_ok=True)

    filename = f"app/reports/{report['executive_summary']['target']}_report.pdf"

    doc = SimpleDocTemplate(filename)

    styles = getSampleStyleSheet()

    story = []

    story.append(Paragraph("<b>AegisAI Vulnerability Assessment Report</b>", styles["Title"]))

    story.append(Paragraph("<br/>", styles["BodyText"]))

    summary = report["executive_summary"]

    story.append(Paragraph(f"<b>Target:</b> {summary['target']}", styles["BodyText"]))

    story.append(Paragraph(f"<b>Risk Score:</b> {summary['risk_score']}", styles["BodyText"]))

    story.append(Paragraph(f"<b>Risk Level:</b> {summary['risk_level']}", styles["BodyText"]))

    story.append(Paragraph("<br/>Open Ports", styles["Heading2"]))

    for port in report["ports"]:
        story.append(Paragraph(str(port), styles["BodyText"]))

    story.append(Paragraph("<br/>Recommendations", styles["Heading2"]))

    story.append(
        Paragraph(
            report["recommendation"],
            styles["BodyText"]
        )
    )

    doc.build(story)

    return filename