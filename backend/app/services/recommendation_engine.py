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