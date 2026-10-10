from app.services.cve_service import find_vulnerabilities, parse_version


def test_parse_version():
    assert parse_version("7.2p2") == (7, 2)
    assert parse_version("1.0.1f") == (1, 0, 1)
    assert parse_version("") == ()


def test_apache_2449_matches_path_traversal():
    ports = [{"port": 80, "service": "http", "product": "Apache httpd", "version": "2.4.49"}]
    cves = {v["cve"] for v in find_vulnerabilities(ports)}
    assert {"CVE-2021-41773", "CVE-2021-42013"} <= cves


def test_patched_version_not_flagged():
    ports = [{"port": 80, "service": "http", "product": "Apache httpd", "version": "2.4.62"}]
    assert find_vulnerabilities(ports) == []


def test_openssh_range():
    ports = [{"port": 22, "service": "ssh", "product": "OpenSSH", "version": "9.6p1"}]
    assert "CVE-2024-6387" in {v["cve"] for v in find_vulnerabilities(ports)}
    ports[0]["version"] = "9.8p1"
    assert "CVE-2024-6387" not in {v["cve"] for v in find_vulnerabilities(ports)}
