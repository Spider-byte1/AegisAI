from app.scanners.nmap_scanner import run_scan


def execute_scan(target: str, update=None) -> list[dict]:
    """
    Scan one host and return its OPEN ports.
    """

    if update:
        update(
            20,
            "Scanning services and ports..."
        )


    result = run_scan(target)


    if update:
        update(
            50,
            "Processing discovered services..."
        )


    ports = []

    for host in result.get("hosts", []):

        ports.extend(
            p
            for p in host.get("ports", [])
            if p.get("state") == "open"
        )


    if update:
        update(
            70,
            "Analyzing vulnerabilities..."
        )


    return ports



def run(target: str, update=None):

    result = execute_scan(
        target,
        update
    )


    if update:

        update(
            90,
            "Generating security report..."
        )


    return result