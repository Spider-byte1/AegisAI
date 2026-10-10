# Security Operations Center (SOC)

## What a SOC does
A SOC monitors systems around the clock, detects suspicious activity, investigates alerts and coordinates response. Typical tools are a SIEM (Security Information and Event Management) that collects and correlates logs, EDR on endpoints, network detection tools, threat intelligence feeds, ticketing, and SOAR (Security Orchestration, Automation and Response) to automate repetitive steps.

## SOC roles
Tier 1 analysts monitor the queue, triage alerts and escalate or close them using playbooks. Tier 2 analysts investigate escalated incidents in depth and contain threats. Tier 3 analysts or threat hunters proactively search for hidden threats and tune detections. A SOC manager coordinates people and process, and detection engineers write and tune rules.

## Alert triage workflow
Read the alert and understand which rule fired and why. Gather context such as the user, host, source IP and time. Check whether the activity is expected, for example a known vulnerability scanner or an admin task. Look at related events before and after, and enrich IPs, domains and hashes with threat intelligence. Decide whether it is a true positive (real malicious activity), a false positive (benign activity that triggered the rule) or a benign true positive (real but authorised). Document the findings and escalate with clear evidence, or close with a reason.

## Metrics
Mean time to detect (MTTD) and mean time to respond (MTTR) measure speed. Others include alert volume, false positive rate, escalation rate and coverage of ATT&CK techniques. Alert fatigue happens when too many low-quality alerts hide the real ones, so tuning rules matters.

## Skills for beginners
Learn networking basics (TCP/IP, DNS, HTTP), Windows and Linux logs, how to read a SIEM query, the MITRE ATT&CK framework, and how common attacks such as phishing, brute force and malware behave. Practise writing clear incident notes, and use labs and capture-the-flag exercises on systems you are allowed to test.
