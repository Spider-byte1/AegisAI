# Network Security

## Firewalls and segmentation
A firewall filters traffic by rules. Stateful firewalls track connections, next-generation firewalls inspect applications and users, and a web application firewall (WAF) filters HTTP attacks. Segment networks into zones, with a DMZ for public-facing servers, so a compromise in one zone does not give access to everything. Default deny with explicit allow rules is the safest policy.

## IDS and IPS
An intrusion detection system (IDS) watches traffic or hosts and raises alerts, while an intrusion prevention system (IPS) sits in line and can block. Signature-based detection finds known patterns, and anomaly-based detection flags unusual behaviour but produces more false positives. Snort and Suricata are common open-source engines, and Zeek produces rich network logs.

## VPN and remote access
A VPN creates an encrypted tunnel to a private network. Pair it with MFA, keep VPN appliances patched because they are frequent targets, and give users access only to what they need. Zero trust access goes further by verifying each request rather than trusting network location.

## Common network attacks
Man-in-the-middle attacks intercept traffic, for example through ARP spoofing on a local network, and TLS with certificate validation defends against them. Denial of service floods a target to make it unavailable, and distributed denial of service (DDoS) uses many sources; mitigations include rate limiting, CDNs and scrubbing services. DNS attacks include cache poisoning, amplification and tunnelling, and DNSSEC signs DNS data. Port scanning is reconnaissance rather than an attack in itself, but it is often the first step.

## Wireless
Use WPA3, or WPA2 with a strong passphrase, and avoid WEP and open networks. Separate guest Wi-Fi from internal networks and disable WPS.
