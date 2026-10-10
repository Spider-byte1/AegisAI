from app.scanners.dns_scanner import get_dns_records
from app.scanners.ssl_scanner import get_ssl_info
from app.scanners.whois_scanner import get_whois


def collect_asset_info(host: str, kind: str = "domain") -> dict:
    """WHOIS/DNS only make sense for domain names; SSL is checked for both."""
    info = {"ssl": get_ssl_info(host)}
    if kind == "domain":
        info["whois"] = get_whois(host)
        info["dns"] = get_dns_records(host)
    return info
