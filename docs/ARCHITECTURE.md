# Architecture

## Request flow

1. The browser calls `POST /scanner/start` with `{target, authorized: true}` and a JWT.
2. The API validates the target (`scanners/validator.py`), enforces the per-user active-scan limit, creates a `Scan` row (`queued`) and dispatches it:
   - `USE_CELERY=true` → `run_scan_task.delay(scan_id)` → Redis → worker
   - otherwise → FastAPI `BackgroundTasks`
3. `services/scan_engine.execute_scan` runs the pipeline. After every stage it commits `stage` and `progress` to the row.
4. The frontend polls `GET /scanner/{id}` every 2 seconds until `status` is `completed` or `failed`.
5. The PDF is generated into `app/reports/` and downloaded through `GET /reports/download/{filename}`, which looks the file up via the database so only the owner can fetch it.

## Pipeline stages

| Stage | Progress | Module |
|---|---|---|
| queued | 0 | — |
| recon | 10 | `whois_scanner` |
| dns | 20 | `dns_scanner` |
| ssl | 35 | `ssl_scanner` |
| nmap | 55 | `nmap_scanner` (fallback: TCP connect) |
| service_detection | 70 | `banner_grabber`, `parser`, `http_scanner` |
| cve_analysis | 80 | `cve_service` |
| risk_analysis | 88 | `risk_engine`, `recommendation_engine`, `risk_agent` |
| report_generation | 95 | `pdf_service` |
| completed | 100 | — |

## Data model

- `users(id, email, full_name, hashed_password, created_at)`
- `scans(id, user_id, target, target_type, status, stage, progress, risk_score, risk_level, results JSON, report_file, error, created_at, completed_at)`

A scan row is also the history record, so there is no separate history table to keep in sync.

## Design decisions

- **One DNS entry point (`get_dns`)**: avoids the import-name mismatches called out in the original debugging notes.
- **Validation before any I/O**: targets are normalized and matched against strict patterns, so nothing user-supplied reaches the Nmap command line unchecked.
- **Graceful degradation**: missing Nmap, WHOIS failure or unreachable TLS adds a warning rather than failing the whole scan.
- **Explainable risk**: the score is a sum of named factors that the UI and PDF both show.
- **AI is optional**: the app is fully functional offline; the AI only writes the executive summary.
