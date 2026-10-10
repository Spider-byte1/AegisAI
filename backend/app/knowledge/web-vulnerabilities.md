# Common Web Vulnerabilities

## SQL injection (SQLi)
SQL injection occurs when user input is concatenated into a database query so the database treats part of the input as SQL. Impact ranges from data theft to authentication bypass and data destruction. Defences: parameterised queries (prepared statements) or an ORM that uses them, least-privilege database accounts, input validation, and never showing database errors to users. Signs in web logs include SQL keywords such as UNION or SELECT in request parameters and a sudden rise in server errors.

## Cross-site scripting (XSS)
XSS lets an attacker get their script to run in another user's browser in the context of a trusted site. Types are stored (saved on the server), reflected (bounced back from a request) and DOM-based (client-side code writes unsafe data into the page). Defences: encode output for the context where it is rendered, use frameworks that escape by default (React escapes text), set a Content-Security-Policy, mark session cookies HttpOnly, and avoid inserting raw HTML.

## Cross-site request forgery (CSRF)
CSRF tricks a logged-in user's browser into sending an unwanted request to a site that trusts their cookies. Defences: anti-CSRF tokens, SameSite cookies and re-authentication for sensitive actions. APIs that read a bearer token from an Authorization header instead of a cookie are not vulnerable in the same way, though that choice has other trade-offs such as exposure to XSS.

## Server-side request forgery (SSRF)
SSRF makes a server fetch a URL chosen by the attacker, which can reach internal services or cloud metadata endpoints such as 169.254.169.254 that are not reachable from the internet. Defences: allow-list destinations, resolve names and block private, loopback and link-local addresses, disable redirects or re-validate each one, and apply network egress rules. Any feature that fetches or scans user-supplied targets, including security scanners, needs this protection.

## Other common flaws
Path traversal reads files outside the intended directory using sequences such as ../ in file names; defend by canonicalising paths and using allow-lists. OS command injection passes user input to a shell; avoid shells and pass arguments as lists. Insecure direct object references expose records by guessable IDs without ownership checks. Unrestricted file upload can lead to code execution, so validate type, size and content and store files outside the web root. Open redirects are abused to make phishing links look trustworthy.
