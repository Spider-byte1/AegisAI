"""Target validation and scan policy.

Everything that touches the network on behalf of a user (Nmap, banner grabbing,
HTTP/SSL checks, WHOIS) must go through `assert_scannable` first. It:

* only accepts a single hostname or IP address - no CIDR ranges, URLs, spaces or
  leading dashes, so a target can never be interpreted as an extra Nmap option;
* resolves the name and rejects loopback, private, link-local (incl. the cloud
  metadata address 169.254.169.254), multicast and other non-public ranges,
  unless ALLOW_PRIVATE_TARGETS is enabled for a local lab.
"""
import ipaddress
import re
import socket
from dataclasses import dataclass

import validators

from app.core.config import settings
from app.core.exceptions import AegisException

_HOST_CHARS = re.compile(r"^[A-Za-z0-9.\-:]+$")  # ':' only for IPv6 literals


@dataclass(frozen=True)
class ScanTarget:
    kind: str  # "ip" | "domain"
    host: str  # normalised input (lower-case domain or canonical IP)
    ip: str  # the address that was checked and should be scanned


def _invalid(message: str) -> AegisException:
    return AegisException(message, code="INVALID_TARGET", status_code=400)


def _not_allowed(message: str) -> AegisException:
    return AegisException(message, code="TARGET_NOT_ALLOWED", status_code=400)


def validate_target(target: str) -> tuple[str, str]:
    """Syntax check only. Returns (kind, normalised_host)."""
    if not isinstance(target, str):
        raise _invalid("Invalid target")

    target = target.strip()
    if not target or len(target) > 253 or target.startswith("-") or not _HOST_CHARS.match(target):
        raise _invalid("Target must be a single domain name or IP address")

    try:
        return "ip", str(ipaddress.ip_address(target))
    except ValueError:
        pass

    host = target.lower().rstrip(".")
    if validators.domain(host):
        return "domain", host

    raise _invalid("Target must be a valid domain name or IP address")


def _check_ip(raw_ip: str) -> str:
    ip = ipaddress.ip_address(raw_ip)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped  # ::ffff:127.0.0.1 must not bypass the checks

    # Never allowed, even in lab mode.
    if ip.is_unspecified or ip.is_multicast or ip.is_link_local:
        raise _not_allowed("This address range cannot be scanned")

    if not settings.ALLOW_PRIVATE_TARGETS and not ip.is_global:
        raise _not_allowed("Scanning private, loopback or internal addresses is not allowed")

    return str(ip)


def resolve_target(kind: str, host: str) -> str:
    if kind == "ip":
        return _check_ip(host)

    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise _invalid("Domain could not be resolved")

    addresses = []
    for info in infos:
        addr = info[4][0]
        if addr not in addresses:
            addresses.append(addr)
    if not addresses:
        raise _invalid("Domain could not be resolved")

    # Every resolved address must pass, otherwise a domain with one public and
    # one internal A record could be used to reach the internal host.
    checked = [_check_ip(a) for a in addresses]
    ipv4 = [a for a in checked if ":" not in a]
    return (ipv4 or checked)[0]


def assert_scannable(target: str) -> ScanTarget:
    kind, host = validate_target(target)
    return ScanTarget(kind=kind, host=host, ip=resolve_target(kind, host))
