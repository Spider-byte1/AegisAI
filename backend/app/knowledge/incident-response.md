# Incident Response

## The incident response lifecycle
The widely taught lifecycle from NIST SP 800-61 Revision 2 has four phases: preparation; detection and analysis; containment, eradication and recovery; and post-incident activity (lessons learned). Revision 3, published in April 2025, supersedes it and aligns incident response with the six functions of the NIST Cybersecurity Framework 2.0 (Govern, Identify, Protect, Detect, Respond and Recover), treating response as part of overall risk management. Many teams still use the four-phase model as a practical way to organise their work.

## Preparation
Define roles, an escalation path and a communication plan, keep contact lists, and document playbooks for common incidents. Make sure logging and backups work and run tabletop exercises. Have tools ready for evidence collection and an isolated environment for analysis.

## Detection and analysis
Confirm whether an event is a real incident, determine its scope (which systems, accounts and data), its severity and the likely attack path, and keep a timeline. Preserve evidence by capturing volatile data first, such as memory, network connections and running processes, because it disappears on reboot. Then take disk images and collect logs. Maintain a chain of custody if the evidence may be used legally.

## Containment, eradication and recovery
Short-term containment stops the spread, for example by isolating a host, disabling an account or blocking an IP address. Long-term containment applies temporary fixes while a clean rebuild is prepared. Eradication removes the cause: malware, persistence mechanisms, compromised accounts and the exploited vulnerability. Recovery restores systems from known-good sources, monitors for re-infection and returns to normal operations.

## Post-incident activity
Hold a blameless lessons-learned review, update detections, playbooks and controls, write the incident report and track actions to completion. Communicate with stakeholders and meet legal or regulatory notification requirements, which vary by country and sector.
