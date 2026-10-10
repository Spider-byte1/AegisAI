# Log Analysis and Detection

## Why logs matter
Logs are the evidence trail for detection and investigation. Collect them centrally in a SIEM, keep clocks synchronised with NTP so events can be correlated, protect logs from tampering and keep them long enough for investigations. Logs that nobody reviews or alerts on have little value.

## Windows security events
Event ID 4624 is a successful logon and 4625 is a failed logon. Logon type 2 is interactive, type 3 is network and type 10 is remote interactive (RDP). Event 4672 means special privileges were assigned to a new logon. Event 4688 records process creation. Event 4720 is a user account created and 4740 is an account lockout. Events 4768 and 4769 are Kerberos ticket requests. Event 1102 means the Security audit log was cleared, which is a strong sign of someone covering their tracks.

## Linux and web server logs
Linux authentication events are in /var/log/auth.log on Debian and Ubuntu and in /var/log/secure on Red Hat based systems. Repeated "Failed password" lines for the SSH service from one source suggest brute force, and a success after many failures suggests the guess worked. Web server access logs show the source IP, request, status code and user agent. Signs of trouble are many 404 errors from one IP, requests for admin paths, SQL keywords or ../ sequences in parameters, and scanner user agents.

## Common detection patterns
Brute force: many failed logons for one account or from one IP in a short window. Password spraying: few attempts per account across many accounts. Impossible travel: logins from distant locations too close together in time. A new privileged account or group change outside a change window. Logons at unusual hours. A burst of file modifications indicating ransomware. Outbound connections at regular intervals suggesting command and control beaconing.

## Investigating with logs
Start from the alert, pivot on the user, host and IP, and build a timeline. Look for what happened before (how the attacker got in) and after (what they did next). Write detections as simple, testable rules and tune them to reduce false positives.
