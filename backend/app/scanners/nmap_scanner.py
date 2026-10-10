import nmap

from app.core.config import settings


def run_scan(target: str) -> dict:
    """Run an Nmap service-detection scan against one validated host/IP."""
    # A fresh PortScanner per call: the old module-level instance was shared
    # between tasks and made importing this module fail when nmap was missing.
    scanner = nmap.PortScanner()
    scanner.scan(
        hosts=target,
        arguments="-Pn -sV -T4",
        timeout=settings.NMAP_TIMEOUT_SECONDS,
    )

    hosts = []
    for host in scanner.all_hosts():
        host_info = {
            "host": host,
            "hostname": scanner[host].hostname(),
            "state": scanner[host].state(),
            "ports": [],
        }
        for protocol in scanner[host].all_protocols():
            for port, service in scanner[host][protocol].items():
                host_info["ports"].append(
                    {
                        "port": port,
                        "protocol": protocol,
                        "state": service["state"],
                        "service": service["name"],
                        "product": service.get("product") or None,
                        "version": service.get("version") or None,
                    }
                )
        hosts.append(host_info)

    return {"target": target, "hosts": hosts}
