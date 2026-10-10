# Phishing and Email Security

## Types of phishing
Phishing is a message that tricks someone into revealing credentials, running malware or sending money. Spear phishing targets a specific person with tailored details, whaling targets executives, smishing uses SMS, and vishing uses phone calls. Business email compromise (BEC) impersonates a colleague or supplier to redirect payments. Attackers also abuse QR codes, shared document links and fake login pages.

## Warning signs
Urgency or threats, unexpected attachments, a sender address that differs slightly from the real domain, a display name that does not match the address, links whose real destination differs from the visible text, requests for credentials or gift cards, and generic greetings. Hover over links to check them and verify unusual requests through a separate channel.

## SPF, DKIM and DMARC
SPF (Sender Policy Framework) is a DNS record listing the servers allowed to send mail for a domain. DKIM (DomainKeys Identified Mail) adds a cryptographic signature to each message, verified with a public key published in DNS. DMARC builds on both: it requires that the visible From domain aligns with the SPF or DKIM domain, tells receivers what to do with failures (none, quarantine or reject) and sends reports back to the domain owner. Together they reduce spoofing of your own domain but do not stop look-alike domains.

## Analysing a suspicious email
Look at the full headers: the Received chain, the Return-Path and the Authentication-Results line showing the SPF, DKIM and DMARC outcomes. Extract URLs and attachment hashes and check them against threat intelligence or a sandbox without opening them on a normal workstation. Check with WHOIS whether the sending domain was registered recently.

## Responding to a phishing email
Do not click or open anything further. Report it through the organisation's process, search mail logs for other recipients, block the sender and URLs, and purge the message from mailboxes. If someone entered credentials, reset the password, revoke sessions and tokens, and check for mailbox forwarding rules created by the attacker. Run awareness training and phishing simulations to improve reporting rates.
