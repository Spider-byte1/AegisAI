# Nmap and Network Scanning

## What Nmap does
Nmap is a network scanner that discovers hosts, finds open ports and can identify the services and versions running on them. Security teams use it for asset inventory, checking firewall rules and finding unexpected exposure. Only scan systems you own or have written permission to test; unauthorised scanning can be illegal and may violate terms of service.

## Port states
Open means a service is accepting connections. Closed means the host answered but nothing listens on that port. Filtered means a firewall or filter blocks the probes so Nmap cannot tell whether the port is open. Unfiltered means the port is reachable but its state is unknown, and open|filtered or closed|filtered means Nmap could not decide between the two. A filtered result is not proof that a service exists.

## Common options
By default Nmap scans the 1000 most common TCP ports. The -sV option performs service and version detection. The -Pn option skips host discovery and treats the host as up, which helps when ICMP is blocked. The -T4 option uses faster timing. The -p- option scans all 65535 ports. The -sS option is the SYN or half-open scan and needs elevated privileges, while -sT is the full connect scan. The -sU option scans UDP, which is slow. The -O option attempts operating system detection, and the Nmap Scripting Engine (NSE) runs scripts for deeper checks.

## Version detection and banner grabbing
Banner grabbing reads the greeting text a service sends, and -sV fingerprints responses to identify the product and version. Results can be wrong: administrators can hide or fake banners, and Linux distributions often backport security fixes without changing the upstream version number. A reported version that looks vulnerable may already be patched, so confirm with the vendor or distribution security advisory.

## Interpreting results
Compare open ports against what should be exposed. Unexpected open ports, clear-text protocols such as Telnet and FTP, outdated service versions and exposed databases are the usual findings. Rescan after fixes to confirm them. A single scan is a snapshot, and firewalls, load balancers and intrusion prevention systems can change what you see.
