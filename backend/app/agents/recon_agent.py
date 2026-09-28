import socket
import whois
import dns.resolver
import requests
import ssl

def run_recon(target):

    result = {
        "target": target
    }

    # IP Address
    try:
        result["ip"] = socket.gethostbyname(target)
    except Exception:
        result["ip"] = None

    # WHOIS
    try:
        w = whois.whois(target)

        result["registrar"] = w.registrar
        result["creation_date"] = str(w.creation_date)
        result["expiration_date"] = str(w.expiration_date)

    except Exception:
        result["registrar"] = None

    # DNS Records
    dns_records = []

    try:
        answers = dns.resolver.resolve(target, "A")

        for r in answers:
            dns_records.append(str(r))

    except Exception:
        pass

    result["dns"] = dns_records

    # HTTP Headers
    try:
        response = requests.get(
            f"https://{target}",
            timeout=5
        )

        result["server"] = response.headers.get("Server")

    except Exception:
        result["server"] = None

    return result