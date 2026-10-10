# Security Hygiene and Hardening

## Patching and inventory
You cannot protect what you do not know about, so keep an inventory of devices, software and internet-facing services. Patch on a schedule, and faster for internet-facing systems and for vulnerabilities known to be exploited. Retire unsupported software.

## Hardening
Remove unnecessary software and services, change default credentials, disable unused accounts and ports, enforce least privilege and apply configuration baselines such as the CIS Benchmarks. Turn on host firewalls and disk encryption. Review cloud permissions and make sure storage buckets and databases are not public by accident.

## Backups and recovery
Follow the 3-2-1 rule: three copies of data, on two different media, with one off-site, and keep one copy offline or immutable so ransomware cannot encrypt it. Test restores regularly, because an untested backup is not a backup.

## Secrets and configuration
Never commit passwords, API keys or private keys to source control. Load them from environment variables or a secrets manager and add .env files to .gitignore. Rotate a secret immediately if it leaks, because removing it from the latest commit does not remove it from git history. Use different secrets for development and production.

## Secure development lifecycle
Threat model early, review code and automate checks. SAST analyses source code, DAST tests the running application and SCA (software composition analysis) finds vulnerable dependencies. Pin and update dependencies, validate all input on the server, use parameterised queries, return generic error messages and log security events. Run security tests in the CI pipeline.

## People and process
Security awareness training, a clear way to report suspicious activity, an incident response plan and regular access reviews reduce risk as much as technology does.
