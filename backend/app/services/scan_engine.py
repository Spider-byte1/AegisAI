from app.scanners.nmap_scanner import run_scan


def execute_scan(target: str) -> list[dict]:
    """Scan one host and return its OPEN ports (closed/filtered are dropped)."""
    result = run_scan(target)
    ports = []
    for host in result.get("hosts", []):
        ports.extend(p for p in host.get("ports", []) if p.get("state") == "open")
    return ports
