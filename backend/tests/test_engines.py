from app.services.cve_service import find_cves
from app.services.risk_engine import calculate_risk
from app.services.vulnerability_service import analyze_services


def test_cve_requires_matching_version():
    assert [c["cve"] for c in find_cves("Apache httpd", "2.4.49")] == ["CVE-2021-41773"]
    assert find_cves("Apache httpd", "2.4.58") == []
    assert [c["cve"] for c in find_cves("vsftpd", "2.3.4")] == ["CVE-2011-2523"]
    assert find_cves("vsftpd", "3.0.5") == []
    assert [c["cve"] for c in find_cves("OpenSSH", "8.3p1")] == ["CVE-2020-15778"]
    assert find_cves("OpenSSH", "9.6p1") == []
    assert [c["cve"] for c in find_cves("nginx", "1.17.6")] == ["CVE-2019-20372"]
    assert find_cves("nginx", "1.25.3") == []


def test_unknown_version_is_never_reported_vulnerable():
    assert find_cves("Apache httpd", None) == []
    assert find_cves(None, "2.4.49") == []
    assert find_cves("Apache httpd", "unknown") == []


def test_analyze_services_uses_nmap_product_and_dedupes():
    ports = [
        {"port": 80, "protocol": "tcp", "state": "open", "service": "http", "product": "Apache httpd", "version": "2.4.49"},
        {"port": 8080, "protocol": "tcp", "state": "open", "service": "http", "product": "Apache httpd", "version": "2.4.49"},
    ]
    services, vulns = analyze_services("93.184.216.34", ports)
    assert len(services) == 2 and all(s["cves"] for s in services)
    assert [v["cve"] for v in vulns] == ["CVE-2021-41773"]  # same CVE on two ports reported once


def test_risk_scoring():
    assert calculate_risk([]) == {"score": 0, "level": "LOW"}
    assert calculate_risk([{"port": 80, "state": "open"}, {"port": 443, "state": "open"}])["score"] == 15
    # closed / filtered ports must not add risk
    assert calculate_risk([{"port": 21, "state": "filtered"}])["score"] == 0
    assert calculate_risk([], [{"severity": "Critical"}])["level"] == "HIGH"  # 40 pts
    assert calculate_risk([{"port": 21, "state": "open"}], [{"severity": "Critical"}, {"severity": "High"}])["level"] == "CRITICAL"
    assert calculate_risk([], [{"severity": "Critical"}] * 5)["score"] == 100  # capped
