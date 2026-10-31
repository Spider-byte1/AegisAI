"""The five autonomous 'agents' of the scan pipeline, as live states.

Each agent is one real stage of services/scanner_service.start_scan(). The pipeline
reports its progress at the start of every stage (15, 35, 65, 80, 90), so the state of
every agent can be derived from the scan's status and progress alone. Nothing is simulated.
"""

# (id, display name, what it does, first progress value of its stage, first value of the next stage)
AGENT_STAGES: tuple[tuple[str, str, str, int, int], ...] = (
    ("recon", "Recon Agent", "WHOIS, DNS and TLS reconnaissance", 15, 35),
    ("nmap", "Nmap Intelligence Agent", "Port discovery and service fingerprinting", 35, 65),
    ("cve", "CVE Intelligence Agent", "Matching service versions to known CVEs", 65, 80),
    ("risk", "Risk Engine", "Scoring exposure and severity", 80, 90),
    ("report", "Report Generator", "Building the PDF summary report", 90, 100),
)


def agent_states(status: str, progress: int) -> list[dict]:
    """[{id, name, description, status, progress}] where status is
    waiting | running | completed | failed, and progress is 0 or 100
    (a running stage has no sub-progress, so it is None: show it as indeterminate)."""
    status = (status or "").lower()
    progress = progress or 0

    # which agent is active right now (None before the first stage or after the last)
    active = next((i for i, (_, _, _, start, end) in enumerate(AGENT_STAGES) if start <= progress < end), None)

    out = []
    for i, (agent_id, name, description, start, end) in enumerate(AGENT_STAGES):
        if status == "completed" or progress >= end:
            state, pct = "completed", 100
        elif status == "failed":
            failed_index = active if active is not None else 0
            state, pct = ("completed", 100) if i < failed_index else (("failed", None) if i == failed_index else ("waiting", 0))
        elif status in ("queued", "") or progress < start:
            state, pct = "waiting", 0
        else:
            state, pct = "running", None
        out.append({"id": agent_id, "name": name, "description": description, "status": state, "progress": pct})
    return out
