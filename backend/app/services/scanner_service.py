from app.scanners.nmap_scanner import run_scan
from app.scanners.banner_grabber import grab_banner
from app.scanners.parser import identify_service
from app.services.risk_engine import calculate_risk
from app.scanners.whois_scanner import get_whois
from app.scanners.dns_scanner import get_dns_records
from app.scanners.ssl_scanner import get_ssl_info
from app.services.cve_service import find_cves
from app.services.recommendation_engine import generate_recommendation
from app.services.report_service import generate_report
from app.services.pdf_service import generate_pdf


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
    vulnerabilities = []

    for port in ports:

        banner = grab_banner(target, port)
        service = identify_service(banner)
        
        cves = find_cves(service)
        recommendations = []

        for cve in cves:
         recommendations.append(generate_recommendation(cve))

        services.append({
            "port": port,
            "banner": banner,
            "service": service,
            "cves": cves,
            "recommendations": recommendations
        })
        vulnerabilities.extend(cves)

    risk = calculate_risk(ports, vulnerabilities)
    
    report = generate_report({
    "target": target,
    "status": "completed",
    "risk": risk,
    "whois": whois_info,
    "dns": dns_info,
    "ssl": ssl_info,
    "ports": ports,
    "services": services,
    "vulnerabilities": vulnerabilities
    })
    pdf_file = generate_pdf(report)

    

    return {
    "scan": {
        "target": target,
        "status": "completed",
        "risk": risk,
        "whois": whois_info,
        "dns": dns_info,
        "ssl": ssl_info,
        "ports": ports,
        "services": services,
        "vulnerabilities": vulnerabilities
    },

    "report": report,
    "pdf": pdf_file
}

    