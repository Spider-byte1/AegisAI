# Security Fundamentals

## CIA triad
Confidentiality means only authorised people can read data (encryption, access control). Integrity means data and systems are not changed without authorisation (hashing, digital signatures, change control). Availability means systems and data are usable when needed (redundancy, backups, DDoS protection). Most security controls and most attacks map to one or more of these goals: ransomware attacks availability, a data breach attacks confidentiality, and tampering with records attacks integrity.

## Threat, vulnerability and risk
A vulnerability is a weakness, such as an unpatched service or a weak password policy. A threat is something that can exploit it, such as a criminal group, a malicious insider or malware. Risk combines the likelihood that a threat exploits a vulnerability with the impact if it does. Risk can be reduced, transferred (insurance), avoided or accepted. An exploit is the technique or code that takes advantage of a vulnerability, and the attack surface is the sum of all the places an attacker can try.

## Authentication, authorisation and accounting
Authentication proves who you are (password, MFA, certificate). Authorisation decides what you may do once identified (roles, permissions). Accounting, also called auditing, records what was done and by whom (logs). Together they are called AAA. Authentication factors are something you know, something you have and something you are.

## Core design principles
Least privilege: give users and services only the access they need. Defense in depth: layer several controls so one failure is not fatal. Separation of duties: split sensitive tasks between people. Fail securely: when something breaks, deny access instead of allowing it. Security through obscurity is not a control on its own. Zero trust: never trust a request just because it comes from inside the network; verify explicitly.

## Types of controls
Preventive controls stop an incident (firewalls, MFA). Detective controls find one (SIEM alerts, IDS). Corrective controls fix things afterwards (patching, restoring backups). Controls can also be grouped as technical, administrative (policies, training) and physical (locks, cameras).
