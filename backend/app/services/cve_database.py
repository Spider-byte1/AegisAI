"""Small built-in CVE table (stop-gap until an NVD feed is wired in).

Each entry is matched on product name AND version range. `min`/`max` are
inclusive; None means unbounded. Entries are only reported when the scanned
service version is known and falls inside the range.
"""

CVE_DATABASE = {
    "apache": [
        {
            "cve": "CVE-2021-41773",
            "severity": "High",
            "cvss": 7.5,
            "description": "Apache HTTP Server path traversal / file disclosure",
            "min": "2.4.49",
            "max": "2.4.49",
        }
    ],
    "openssh": [
        {
            "cve": "CVE-2020-15778",
            "severity": "High",
            "cvss": 7.8,
            "description": "OpenSSH scp command injection",
            "min": None,
            "max": "8.3",
        }
    ],
    "nginx": [
        {
            "cve": "CVE-2019-20372",
            "severity": "Medium",
            "cvss": 5.3,
            "description": "nginx HTTP request smuggling via error_page (configuration dependent)",
            "min": None,
            "max": "1.17.6",
        }
    ],
    "vsftpd": [
        {
            "cve": "CVE-2011-2523",
            "severity": "Critical",
            "cvss": 9.8,
            "description": "vsftpd 2.3.4 backdoor command execution",
            "min": "2.3.4",
            "max": "2.3.4",
        }
    ],
}
