from app.scanners.validator import validate_target
from app.scanners.dns_scanner import get_dns_records
from app.scanners.whois_scanner import get_whois
from app.scanners.ssl_scanner import get_ssl_info
from app.scanners.http_scanner import check_http
from app.agents.recon_agent import run_recon

def run_recon(target):
    target_type = validate_target(target)

    result = {
        "target": target,
        "type": target_type
    }

    if target_type == "domain":
        result["dns"] = get_dns_records(target)
        result["whois"] = get_whois(target)
        result["ssl"] = get_ssl_info(target)
        result["http"] = check_http(target)

    return result


def start_recon(target):
     return run_recon(target)