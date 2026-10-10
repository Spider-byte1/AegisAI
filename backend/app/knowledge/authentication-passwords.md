# Authentication and Password Security

## Storing passwords
Never store passwords in plain text or with fast general-purpose hashes such as MD5 or plain SHA-1. Use a slow, salted password hashing algorithm: Argon2id, scrypt or bcrypt. A salt is a random per-password value that defeats precomputed rainbow tables, and the deliberately slow work factor makes brute force expensive. Note that bcrypt only uses the first 72 bytes of a password.

## Common password attacks
Brute force tries many guesses and a dictionary attack tries likely passwords. Password spraying tries one common password against many accounts to avoid lockouts. Credential stuffing replays username and password pairs leaked from other sites. Defences: multi-factor authentication, rate limiting and carefully designed lockouts, breached-password checks and monitoring of failed logins.

## Multi-factor authentication
MFA combines factors: something you know, something you have and something you are. Authenticator apps and hardware security keys (FIDO2 and WebAuthn) are stronger than SMS codes, which can be intercepted through SIM swapping. Phishing-resistant methods such as passkeys bind the login to the real website. MFA fatigue attacks spam push approvals until the user accepts one, and number matching helps against them.

## Sessions and JSON Web Tokens
A JWT is a signed token containing claims such as the user ID and an expiry time. Common mistakes: accepting the "none" algorithm, not pinning the allowed algorithm, using a short or guessable signing secret, never expiring tokens, and storing tokens where scripts can read them. localStorage is exposed to XSS, while an HttpOnly cookie cannot be read by scripts but then needs CSRF protection. Always validate the signature and the exp claim on the server and keep access tokens short-lived.

## Good practice
Prefer long passphrases to complexity rules, allow password managers, and return the same error for unknown users and wrong passwords so accounts cannot be enumerated. Protect password reset flows, apply least privilege to roles and review access regularly.
