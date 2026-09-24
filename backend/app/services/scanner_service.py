from app.scanners.nmap_scanner import run_scan
from app.services.risk_engine import calculate_risk

def start_scan(target):

    result = run_scan(target)

    ports = []

    for host in result:
        ports.extend(host["ports"])

    score = calculate_risk(ports)

    return {

        "scan": result,

        "risk_score": score

    }