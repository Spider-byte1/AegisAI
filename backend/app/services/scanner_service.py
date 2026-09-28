from app.scanners.nmap_scanner import run_scan
from app.scanners.banner_grabber import grab_banner
from app.scanners.parser import identify_service
from app.services.risk_engine import calculate_risk
from app.scanners.whois_scanner import get_whois
from app.scanners.dns_scanner import get_dns_records
from app.scanners.ssl_scanner import get_ssl_info


def start_scan(target: str):

    whois_info = get_whois(target)

    dns_info = get_dns_records(target)

    ssl_info = get_ssl_info(target)

    result = run_scan(target)

    hosts = result.get("hosts", [])

    ports = []

    for host in hosts:
     ports.extend(host.get("ports", []))

    services = []

    for port in ports:

        banner = grab_banner(target, port)

        services.append({
            "port": port,
            "banner": banner,
            "service": identify_service(banner)
        })

    risk = calculate_risk(ports, [])

    return {
        "target": target,
        "ports": ports,
        "services": services,
        "risk": risk,
        "status": "completed"
    }