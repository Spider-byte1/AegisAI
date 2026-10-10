import re

from app.services.cve_database import CVE_DATABASE


def _version_tuple(version: str | None) -> tuple[int, ...] | None:
    """'2.4.49' -> (2, 4, 49); '8.3p1' -> (8, 3); unknown -> None."""
    if not version:
        return None
    match = re.match(r"\d+(?:\.\d+)*", version.strip())
    if not match:
        return None
    return tuple(int(part) for part in match.group(0).split("."))


def _pad(a: tuple[int, ...], b: tuple[int, ...]):
    n = max(len(a), len(b))
    return a + (0,) * (n - len(a)), b + (0,) * (n - len(b))


def _in_range(version: tuple[int, ...], low: str | None, high: str | None) -> bool:
    if low is not None:
        v, lo = _pad(version, _version_tuple(low))
        if v < lo:
            return False
    if high is not None:
        v, hi = _pad(version, _version_tuple(high))
        if v > hi:
            return False
    return True


def find_cves(product: str | None, version: str | None) -> list[dict]:
    """Return CVEs whose product matches and whose version range contains `version`."""
    parsed = _version_tuple(version)
    if not product or parsed is None:
        return []  # no version -> we can't claim the service is vulnerable

    name = product.lower()
    found = []
    for key, entries in CVE_DATABASE.items():
        if key in name:
            for entry in entries:
                if _in_range(parsed, entry.get("min"), entry.get("max")):
                    found.append({k: v for k, v in entry.items() if k not in ("min", "max")})
    return found
