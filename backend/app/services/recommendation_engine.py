def generate_recommendation(vulnerability):

    cve = vulnerability.get("cve", "")

    if cve == "CVE-2021-41773":
        return {
            "priority": "Immediate",
            "recommendation": "Update Apache HTTP Server to the latest stable version and disable directory traversal."
        }

    elif cve == "CVE-2020-15778":
        return {
            "priority": "High",
            "recommendation": "Upgrade OpenSSH and restrict shell command execution."
        }

    elif cve == "CVE-2019-20372":
        return {
            "priority": "Medium",
            "recommendation": "Update Nginx and disable vulnerable HTTP/2 features if required."
        }

    elif cve == "CVE-2011-2523":
        return {
            "priority": "Critical",
            "recommendation": "Immediately replace the affected vsFTPd version and investigate for compromise."
        }

    return {
        "priority": "Unknown",
        "recommendation": "Review vendor advisories and apply the latest security updates."
    }


# Advice for services that are risky simply by being reachable. Priority = how urgently to act.
PORT_ADVICE = {
    21: ("High", "FTP sends files and passwords in clear text. Replace it with SFTP or FTPS, or restrict access to trusted networks."),
    22: ("Low", "Use key-based SSH login or multi-factor authentication, disable direct root login and restrict access by IP address or VPN."),
    23: ("Critical", "Telnet is unencrypted. Disable it and use SSH instead."),
    80: ("Medium", "Redirect all HTTP traffic to HTTPS and enable HSTS."),
    443: ("Low", "Keep TLS modern (TLS 1.2 or newer), renew certificates before they expire and disable weak ciphers."),
    445: ("High", "SMB should not be reachable from untrusted networks. Block it at the firewall and apply Windows security updates."),
    3306: ("High", "Do not expose MySQL to the internet. Bind it to localhost or a private network and require strong credentials."),
    3389: ("High", "Remote Desktop is a common ransomware entry point. Put it behind a VPN with multi-factor authentication."),
    5432: ("High", "Do not expose PostgreSQL to the internet. Restrict it to private networks and require strong credentials."),
    6379: ("High", "Redis has no authentication by default. Bind it to localhost or a private network and set a password."),
    27017: ("High", "Do not expose MongoDB to the internet. Enable authentication and restrict network access."),
}


def port_recommendations(ports) -> list[dict]:
    """One recommendation per open port that has known advice."""
    out = []
    for port in ports or []:
        number = port.get("port") if isinstance(port, dict) else port
        if number in PORT_ADVICE:
            priority, text = PORT_ADVICE[number]
            out.append({"priority": priority, "recommendation": text, "port": number})
    return out
