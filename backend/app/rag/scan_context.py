"""Turns a scan's analysis into context for the Security Copilot.

Service banners, product and version strings come from the scanned server, which may be
hostile: a banner can contain text written to manipulate an AI model (prompt injection) or
markdown that loads remote images. So every piece of free text is reduced to a harmless
character set before it is shown to the model or rendered as markdown. Our own wording
(headings, labels) is added around it afterwards.
"""
import re
from dataclasses import dataclass

_UNSAFE = re.compile(r"[^A-Za-z0-9 ._+\-/():,]")
_SPACES = re.compile(r"\s+")
_URL_START = re.compile(r"(?i)(?:[a-z][a-z0-9+.\-]*:)?//|\bwww\.")


def safe_text(value, limit: int = 160) -> str:
    """Letters, digits and a few punctuation marks only: no tags, markdown, quotes or brackets,
    and no URL openers (markdown renderers turn bare URLs into clickable links)."""
    text = _UNSAFE.sub(" ", "" if value is None else str(value))
    text = _URL_START.sub(" ", text)
    return _SPACES.sub(" ", text).strip()[:limit]


@dataclass(frozen=True)
class ScanContext:
    scan_id: int
    target: str
    llm_text: str  # <scan_data> block placed in the prompt
    markdown: str  # readable analyst brief, used as the answer when no AI is configured


def build_scan_context(analysis: dict) -> ScanContext:
    analyst = analysis["analyst"]
    health = analysis["health"]
    target = safe_text(analysis.get("target"), 100)
    findings = analyst["findings"]
    recs = analyst["recommendations"]

    def finding_line(f: dict) -> str:
        return f"[{f['severity'].upper()}] {safe_text(f['title'])}: {safe_text(f['detail'], 220)}"

    def rec_line(r: dict) -> str:
        return f"[{safe_text(r['priority'], 20)}] {safe_text(r['text'], 220)} (applies to {safe_text(r['applies_to'], 30)})"

    trend = ""
    if health.get("delta") is not None:
        trend = f" Previous scan of this target: {health['previous_score']}/100 (change {health['delta']:+d})."

    header = (f"Target {target}. Risk level {analyst['risk_level']} (risk score {analyst['risk_score']}/100). "
              f"Security score {health['score']}/100, grade {health['grade']}.{trend}")

    llm_text = "\n".join([
        f'<scan_data scan_id="{int(analysis["scan_id"])}" target="{target}">',
        header,
        "Findings:",
        *[f"- {finding_line(f)}" for f in findings],
        "Recommended actions:",
        *[f"- {rec_line(r)}" for r in recs],
        "</scan_data>",
    ])

    markdown = "\n".join([
        f"**AegisAI Analyst Report: {target}**",
        "",
        f"Security score **{health['score']}/100** (grade {health['grade']}), risk level **{analyst['risk_level']}**.{trend}",
        "",
        safe_text(analyst["summary"], 700),
        "",
        "**Findings**",
        *[f"- {finding_line(f)}" for f in findings],
        "",
        "**Recommended actions**",
        *([f"{i}. {rec_line(r)}" for i, r in enumerate(recs, start=1)] or ["- No actions required."]),
    ])
    return ScanContext(scan_id=int(analysis["scan_id"]), target=target, llm_text=llm_text, markdown=markdown)
