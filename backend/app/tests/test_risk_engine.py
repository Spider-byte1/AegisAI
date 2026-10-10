from app.services.risk_engine import calculate_risk, risk_level


def test_levels_match_readme_bands():
    assert risk_level(0) == "Low" and risk_level(24) == "Low"
    assert risk_level(25) == "Medium" and risk_level(49) == "Medium"
    assert risk_level(50) == "High" and risk_level(79) == "High"
    assert risk_level(80) == "Critical"


def test_clean_target_is_low():
    r = calculate_risk([{"port": 443}], [], {"available": True, "issues": []}, None)
    assert r["level"] == "Low"


def test_dangerous_ports_and_cves_raise_score():
    ports = [{"port": 23}, {"port": 3389}, {"port": 445}]
    vulns = [{"severity": "Critical", "cvss": 9.8, "known_exploited": True}] * 3
    r = calculate_risk(ports, vulns, {"available": True, "issues": ["Certificate has expired"]}, None)
    assert r["score"] >= 80 and r["level"] == "Critical"
    assert any("Telnet" in f["factor"] for f in r["factors"])


def test_score_is_capped():
    ports = [{"port": p} for p in (21, 23, 445, 3389, 5900, 3306, 6379, 27017)]
    vulns = [{"severity": "Critical", "cvss": 10, "known_exploited": True}] * 20
    assert calculate_risk(ports, vulns)["score"] == 100
