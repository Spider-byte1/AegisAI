# API reference

Interactive docs: `http://127.0.0.1:8000/docs`. All routes except `/health`, `/auth/register` and `/auth/login` need `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/auth/register` | `{email, password (8+), full_name}` → user |
| POST | `/auth/login` | `{email, password}` → `{access_token}` |
| GET | `/auth/me` | Current user |
| GET / PUT | `/profile/` | View or update name / password |
| POST | `/scanner/start` | `{target, authorized}` → scan summary (202). Alias: `/scanner/scan` |
| GET | `/scanner/{id}/status` | `{scan_id, status, progress, stage, error}` |
| GET | `/scanner/{id}` | Full result (ports, CVEs, risk, recommendations) |
| GET | `/history/` | Query: `page`, `page_size`, `search`, `risk_level`, `status` |
| DELETE | `/history/{id}` | Delete a scan and its PDF |
| GET | `/dashboard/` | Totals, distributions, weekly activity, top ports |
| GET | `/reports/download/{filename}` | Owner-only PDF download |
| POST | `/recon/` | Passive recon only: `{target}` → DNS + WHOIS |
| POST | `/risk/calculate` | Score arbitrary `{ports, vulnerabilities, ssl, http}` |

## Errors

| Code | Meaning |
|---|---|
| 400 | `authorized` was not confirmed |
| 401 | Missing or expired token |
| 404 | Scan or report does not exist or belongs to someone else |
| 422 | Invalid target or request body |
| 429 | Too many active scans for this user |
