from app.scanners.dns_scanner import get_dns_records
from app.scanners.http_scanner import check_http
from app.scanners.ssl_scanner import get_ssl_info
from app.scanners.validator import assert_scannable
from app.scanners.whois_scanner import get_whois


def run_recon(target: str) -> dict:
    scan_target = assert_scannable(target)  # raises AegisException on bad/forbidden targets

    result = {"target": scan_target.host, "type": scan_target.kind, "ip": scan_target.ip}
    if scan_target.kind == "domain":
        result["dns"] = get_dns_records(scan_target.host)
        result["whois"] = get_whois(scan_target.host)
        result["ssl"] = get_ssl_info(scan_target.host)
        result["http"] = check_http(scan_target.host)
    return result
