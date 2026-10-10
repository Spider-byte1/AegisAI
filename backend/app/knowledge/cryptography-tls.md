# Cryptography and TLS Basics

## Encryption, hashing and encoding
Encryption is reversible with a key and protects confidentiality. Hashing is a one-way fingerprint used for integrity checks and password storage. Encoding such as Base64 only changes the representation and gives no security. A digital signature uses a private key to prove who created data and that it was not altered.

## Symmetric and asymmetric encryption
Symmetric encryption uses one shared key and is fast; AES is the standard choice, ideally in an authenticated mode such as AES-GCM. Asymmetric encryption uses a public and private key pair (RSA, elliptic-curve cryptography) and solves key exchange and signatures but is slower. Protocols such as TLS use asymmetric cryptography to agree on a key and then symmetric encryption for the data itself.

## TLS and certificates
TLS secures traffic between a client and a server. TLS 1.2 and TLS 1.3 are the versions to use, while SSL 2.0, SSL 3.0, TLS 1.0 and TLS 1.1 are deprecated. A certificate, issued by a certificate authority, binds a domain name to a public key. Common certificate problems are expiry, a hostname mismatch, self-signed certificates in production and incomplete chains. HSTS tells browsers to always use HTTPS for a site.

## Weak and broken algorithms
Avoid MD5 and SHA-1 for signatures and integrity because practical collision attacks exist, and avoid DES, 3DES, RC4 and export-grade or NULL cipher suites. Prefer SHA-256 or stronger hashes, AES, and modern elliptic-curve key exchange. Do not invent your own cryptography; use well-reviewed libraries.

## Key management
Protect private keys, rotate keys and certificates before they expire and never commit secrets to source control. Keep keys in a secrets manager or a hardware security module for high-value uses. Use a cryptographically secure random generator for keys and tokens.
