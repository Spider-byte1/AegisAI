# MITRE ATT&CK and Attack Frameworks

## What ATT&CK is
MITRE ATT&CK is a public knowledge base of real-world adversary tactics and techniques. Tactics are the attacker's goals (the why) and techniques are how they achieve them (the how), each with an ID such as T1566. Analysts use it to describe attacks consistently, map detections, find coverage gaps and plan threat hunts.

## The 14 enterprise tactics
Reconnaissance, Resource Development, Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Command and Control, Exfiltration and Impact. They roughly follow the order of an intrusion, but attackers can skip or repeat steps.

## Frequently seen techniques
T1566 Phishing (Initial Access). T1190 Exploit Public-Facing Application (Initial Access). T1078 Valid Accounts (used in several tactics). T1059 Command and Scripting Interpreter (Execution). T1110 Brute Force (Credential Access). T1021 Remote Services (Lateral Movement). T1486 Data Encrypted for Impact, which is ransomware (Impact).

## Using ATT&CK in a SOC
When an alert fires, map the behaviour to a technique to understand what stage the attacker has reached and what might come next. Detection rules can be tagged with technique IDs to measure coverage. Threat intelligence reports often list the ATT&CK techniques used by a group, which helps decide which detections to build first.

## The Cyber Kill Chain
Lockheed Martin's Cyber Kill Chain describes seven stages: reconnaissance, weaponization, delivery, exploitation, installation, command and control, and actions on objectives. It is simpler and more linear than ATT&CK. Breaking the chain early, for example by blocking delivery, prevents the later stages.
