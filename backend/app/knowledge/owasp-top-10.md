# OWASP Top 10

## What it is
The OWASP Top 10 is an awareness document from the Open Worldwide Application Security Project that lists the most critical web application security risks. It is updated every few years and is a starting point, not a complete testing checklist. The current edition is OWASP Top 10:2025, which replaced the 2021 edition.

## The 2025 list
A01 Broken Access Control (Server-Side Request Forgery is now part of this category). A02 Security Misconfiguration. A03 Software Supply Chain Failures (new, broader than the old vulnerable and outdated components category). A04 Cryptographic Failures. A05 Injection. A06 Insecure Design. A07 Authentication Failures. A08 Software or Data Integrity Failures. A09 Security Logging and Alerting Failures. A10 Mishandling of Exceptional Conditions (new).

## What changed from 2021
Two categories are new: Software Supply Chain Failures and Mishandling of Exceptional Conditions. Server-Side Request Forgery, which was A10 in 2021, was merged into Broken Access Control. Security Misconfiguration moved from fifth to second place and Injection dropped from third to fifth. Logging and Monitoring Failures was renamed Logging and Alerting Failures to stress that logs are only useful if someone is alerted.

## Broken access control and misconfiguration
Broken access control means users can act outside their intended permissions, for example reading another user's records by changing an ID in a request (an insecure direct object reference, called BOLA in API terms) or calling an admin function without being an admin. Prevent it by enforcing authorisation on the server for every request, denying by default and testing ownership checks. Security misconfiguration covers default passwords, public cloud storage, verbose error pages, unnecessary services and missing security headers; prevent it with hardened baselines and automated configuration checks.

## Injection, cryptography and design failures
Injection happens when untrusted input is interpreted as code or commands (SQL, operating system commands, LDAP, templates); the main defence is parameterised queries and strict input validation. Cryptographic failures include missing encryption, weak algorithms and poor key handling. Insecure design means the flaw is in the architecture or business logic, so perfect coding cannot fix it; threat modelling helps.

## Authentication, integrity, logging and exceptions
Authentication failures include weak passwords, missing MFA, exposure to credential stuffing and poor session handling. Integrity failures happen when software updates, plugins or pipelines are trusted without verifying signatures. Logging and alerting failures delay the detection of breaches. Mishandling of exceptional conditions covers poor error handling, such as systems that fail open or leak internal details when something unexpected happens.
