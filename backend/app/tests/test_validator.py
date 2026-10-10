import pytest

from app.scanners.validator import InvalidTarget, validate_target


@pytest.mark.parametrize("raw,expected", [
    ("scanme.nmap.org", ("scanme.nmap.org", "domain")),
    ("https://Example.com/path?x=1", ("example.com", "domain")),
    ("example.com:8443", ("example.com", "domain")),
    ("192.0.2.10", ("192.0.2.10", "ip")),
])
def test_valid_targets(raw, expected):
    assert validate_target(raw) == expected


@pytest.mark.parametrize("raw", ["", "   ", "exa mple.com", "example.com; rm -rf /", "-oN /tmp/x", "$(id).com", "a" * 300 + ".com", "0.0.0.0", "224.0.0.1"])
def test_invalid_targets(raw):
    with pytest.raises(InvalidTarget):
        validate_target(raw)
