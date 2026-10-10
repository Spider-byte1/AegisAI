# 🛡️ AegisAI

**Vulnerability assessment platform with a built-in cybersecurity assistant.**
Enter a domain or IP you are allowed to test. AegisAI runs port and service scanning (Nmap), collects WHOIS / DNS / SSL data, matches detected software versions against known CVEs, scores the risk and produces a PDF report. A separate **Security Assistant** is a ChatGPT-style chat popup for cybersecurity questions: it streams formatted answers and uses a built-in knowledge base as grounding (retrieval-augmented generation).

> **Authorized use only.** Scan systems you own or have written permission to assess. The API refuses to start a scan until the caller confirms authorization, and blocks private, loopback and cloud-metadata addresses by default.

Final-year Computer Science & Engineering project by **Sudhanshu Chauhan**.

---

## Features

| Area | What it does |
|---|---|
| Accounts | Register / login, bcrypt password hashing, short-lived JWT access tokens |
| Data isolation | Every scan and chat belongs to one user; other users get a 404 |
| Scan safety | Target must be a single domain or IP (no ranges, URLs or option injection). Names are resolved and every address is checked; private, loopback, link-local and metadata ranges are rejected. Authorization confirmation required. Max active scans per user. |
| Port scan | Nmap `-Pn -sV -T4` on the default top 1000 TCP ports; only **open** ports are kept |
| Asset info | WHOIS, DNS records and SSL certificate details for domains |
| CVE matching | Built-in table matched on product **and version range**; unknown versions are never flagged |
| Risk engine | Transparent 0–100 score and LOW / MEDIUM / HIGH / CRITICAL level (see [Risk model](#risk-model)) |
| Recommendations | Fix advice for each matched CVE |
| Reports | PDF per scan via `GET /scanner/report/{id}`, owner only (no download button in the dashboard yet) |
| Background scans | Celery + Redis worker with live stage and percentage progress |
| Dashboard | Total scans, risk counts, scan history with delete |
| **Security Assistant** | Floating chat popup on the dashboard. Open-ended, conversational answers that stream in as they are written, with Markdown formatting (lists, tables, code blocks), a Stop button and follow-up memory. Relevant notes from a 17-document knowledge base are attached and cited as sources. Needs an Anthropic API key for chat; without one it shows knowledge-base passages. |
| Tests | 96 backend tests, fully offline; CI on every push |

The scanner itself is rule-based. The AI feature is the Security Assistant.

## Architecture

```text
Next.js 16 (App Router) · React 19 · Tailwind 4
        │  REST + Bearer JWT
        ▼
FastAPI ── auth · scanner · history · dashboard · profile · recon · risk · assistant
        │
        ├── PostgreSQL (SQLite for quick tries): users, scans, chat_logs
        │
        └── Celery worker ── Redis
              run_scan_task
                validate target → Nmap → WHOIS/DNS/SSL → service analysis
                → CVE match → risk score → PDF report

Security Assistant (RAG, same API process)
  question → BM25 keyword retrieval over knowledge/*.md (attached only if relevant)
           → Claude answers from its own knowledge + the notes, streamed to the popup
```

## Project structure

```text
AegisAI/
├── backend/
│   ├── app/
│   │   ├── api/         auth, scanner, history, dashboard, profile, recon, risk, assistant, deps
│   │   ├── core/        config, security (bcrypt), auth (JWT), logger, error handling
│   │   ├── database/    engine, session
│   │   ├── models/      user, scan, chat
│   │   ├── schemas/     Pydantic request/response models
│   │   ├── scanners/    validator (target policy), nmap, whois, dns, ssl, banner, http
│   │   ├── services/    scanner_service (pipeline), cve, risk_engine, pdf, report, ...
│   │   ├── rag/         loader, retriever (BM25), prompt, llm client, service
│   │   ├── knowledge/   17 markdown documents behind the assistant
│   │   ├── worker/      celery_app, tasks
│   │   └── main.py
│   ├── scripts/reset_db.py      dev-only: drop and recreate tables
│   ├── tests/                   pytest suite
│   ├── Dockerfile · .env.example
├── frontend/
│   ├── app/             page.tsx (dashboard), login/
│   ├── components/      AssistantWidget.tsx (chat popup), Markdown.tsx (safe renderer)
│   ├── lib/api.ts       fetch helper that attaches the token
│   ├── Dockerfile · .env.local.example
├── .github/workflows/ci.yml
├── docker-compose.yml · .env.example
├── requirements.txt · requirements-dev.txt
└── README.md · LICENSE
```

## Quick start (local, no Docker)

**Prerequisites:** Python 3.12 (the version Docker and CI use), Node.js 20.9+, [Nmap](https://nmap.org/download) on your `PATH`, Redis, and PostgreSQL (SQLite also works for a quick try).

```bash
git clone https://github.com/Spider-byte1/AegisAI.git
cd AegisAI
python -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\activate
pip install -r requirements-dev.txt
```

### 1. Configure the backend

```bash
cd backend
cp .env.example .env               # Windows: copy .env.example .env
```

Edit `backend/.env`:

- `DATABASE_URL`: `postgresql+psycopg://USER:PASSWORD@localhost:5432/aegisai_db` (create the database first), or `sqlite:///./aegisai.db` for a quick try.
- `SECRET_KEY`: **required, 32+ characters.** Generate one: `python -c "import secrets; print(secrets.token_urlsafe(48))"`. The app refuses to start without a real key.

Tables are created automatically on first start. If you are upgrading from an older version whose tables differ, run `python -m scripts.reset_db --yes` once (**deletes all data**, development only).

### 2. Run the services

```bash
# Redis (Docker is the easiest way)
docker run -d --name aegisai-redis -p 6379:6379 redis:7

# API  (from backend/)
uvicorn app.main:app --reload

# Worker, in a second terminal (from backend/); on Windows add:  -P solo
celery -A app.worker.celery_app worker --loglevel=info
```

API: http://127.0.0.1:8000 · Swagger: http://127.0.0.1:8000/docs · Health: `GET /health`

### 3. Run the frontend

```bash
cd frontend
cp .env.local.example .env.local   # Windows: copy .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000, register, tick the authorization box and scan `scanme.nmap.org` (Nmap's official test host). Click the **Security Assistant** bubble in the bottom-right corner of the dashboard to open the chat popup.

## Docker (everything at once)

```bash
cp .env.example .env               # Windows: copy .env.example .env
# edit .env: set SECRET_KEY (32+ chars) and POSTGRES_PASSWORD
docker compose up --build
```

Starts PostgreSQL, Redis, the API, a Celery worker and the frontend. Open http://localhost:3000. The database and Redis are not published to your host. Building the frontend image needs internet access (the app loads Google Fonts at build time).

`ALLOW_PRIVATE_TARGETS` defaults to `false` here on purpose: inside Docker, "private" addresses include your other containers and host network.

## Configuration

Set these in `backend/.env` (or the root `.env` for Docker).

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | none (**required**) | Database connection string |
| `SECRET_KEY` | none (**required**) | JWT signing key, 32+ characters |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 30 | Token lifetime |
| `ALLOW_PRIVATE_TARGETS` | false | `true` only for a lab: lets you scan private / loopback addresses |
| `MAX_ACTIVE_SCANS_PER_USER` | 3 | Concurrent queued or running scans per user |
| `NMAP_TIMEOUT_SECONDS` | 600 | Per-scan Nmap timeout |
| `CELERY_BROKER_URL` | redis://localhost:6379/0 | Redis broker and result backend |
| `CORS_ORIGINS` | localhost:3000, 127.0.0.1:3000 | Comma-separated allowed origins |
| `ANTHROPIC_API_KEY` | empty | Enables AI-written assistant answers. Empty = passages only. |
| `LLM_MODEL` | `claude-haiku-4-5-20251001` | Model used by the assistant (a larger model such as `claude-sonnet-5-5` gives richer answers) |
| `ASSISTANT_SCOPE` | cybersecurity | `cybersecurity`: chat freely about security and IT topics and politely decline unrelated ones. `general`: answer any topic |
| `RAG_MAX_QUESTIONS_PER_HOUR` | 30 | Assistant questions per user per hour |
| `RAG_TOP_K`, `RAG_MIN_SCORE`, `RAG_MIN_COVERAGE` | 5, 3.0, 0.5 | Retrieval size and relevance gate |
| `LLM_MAX_TOKENS`, `LLM_TIMEOUT_SECONDS` | 1500, 60 | Maximum answer length and API timeout |

## API overview

All routes except register, login and health need `Authorization: Bearer <token>`.

| Method and path | Purpose |
|---|---|
| `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Accounts (login is an OAuth2 form: email in the `username` field) |
| `POST /scanner/start` | Queue a scan: `{"target": "...", "authorized": true}` |
| `GET /scanner/status/{id}` · `/result/{id}` · `/report/{id}` | Progress, full findings, PDF |
| `GET /history/` · `DELETE /history/{id}` | Your scans |
| `GET /dashboard/stats` · `GET /profile/` | Counts and account info |
| `POST /recon/scan` · `POST /risk/` | Quick recon and risk calculation |
| `POST /assistant/ask/stream` | Security Assistant, streamed (newline-delimited JSON events: `delta`, then `done` or `error`) |
| `POST /assistant/ask` · `GET` / `DELETE /assistant/history` | Same answer in one piece; saved conversation |
| `GET /health` | Liveness check |

## Security Assistant

A ChatGPT-style chat in a popup window (bottom-right corner of the dashboard).

- **Open-ended answers:** the model answers from its own knowledge, in a conversational tone, and remembers the last 10 messages for follow-up questions.
- **Streaming:** text appears as it is written, with a **Stop** button (stopping closes the connection to the model right away, so it stops generating, and the partial answer is kept). Answers are rendered as Markdown (headings, lists, tables, code blocks, links). Raw HTML and `javascript:` links from the model are never rendered.
- **Grounding (RAG):** each question is searched (BM25 keyword search) against 17 short documents (OWASP, ports, Nmap, CVE/CVSS, phishing, SOC work, incident response, MITRE ATT&CK, logs, passwords, TLS, and more) plus a generated page explaining AegisAI's own scoring. Relevant passages are attached to the prompt and cited as numbered, expandable sources. If nothing matches, the model simply answers without notes. On a 30-question labelled set the right document is first for 29 questions and in the top 3 for all 30 (checked by a test).
- **Scope:** by default (`ASSISTANT_SCOPE=cybersecurity`) it stays on cybersecurity and IT security and politely declines unrelated topics; set `general` to allow anything.
- **Safety:** defensive and educational focus (it won't write exploits or malware or help attack systems you don't own); per-user hourly question cap; input and history validated server-side; conversations stored per user and deletable ("New chat").
- **Needs an API key:** chat requires `ANTHROPIC_API_KEY` (API usage is billed separately from any claude.ai subscription). Without one, the popup falls back to showing matching knowledge-base passages, and says so. If the AI service fails, users get the passages instead of an error.
- **Not ChatGPT:** it has no web access or real-time data, so it can be wrong or out of date on current events and specific product versions.
- **Add knowledge:** drop a markdown file into `backend/app/knowledge/` (`# Title`, then `## Section` blocks) and add a labelled question in `backend/tests/test_rag_retrieval.py`.

## Risk model

The score starts at 0 and is capped at 100. Only open ports count.

| Factor | Points |
|---|---|
| Open port 21, 23 or 80 | +10 each |
| Open port 22 or 443 | +5 each |
| Matched CVE: Critical / High / Medium / Low | +40 / +25 / +15 / +5 each |

| Score | Level |
|---|---|
| 0–19 | LOW |
| 20–39 | MEDIUM |
| 40–69 | HIGH |
| 70–100 | CRITICAL |

## Testing

```bash
cd backend && python -m pytest        # 96 tests, offline (in-memory SQLite, no Redis/Nmap/API key)
cd frontend && npm run build          # also type-checks
```

CI (`.github/workflows/ci.yml`) runs both on every push and pull request.

## Troubleshooting

| Problem | Fix |
|---|---|
| `RuntimeError: SECRET_KEY is missing, too short...` | Put a 32+ character random key in `backend/.env` (command above). |
| `Scan failed: PortScannerError` | Nmap is not installed or not on `PATH`. Install it and restart the worker. |
| `Scan queue unavailable` (503) | Redis is not running or `CELERY_BROKER_URL` is wrong. |
| Scan stays `queued` | Start the Celery worker (Windows: add `-P solo`). |
| `column ... does not exist` after upgrading | Tables changed shape: `python -m scripts.reset_db --yes` (deletes data). |
| `This address range cannot be scanned` / private target rejected | Intended. For a lab network set `ALLOW_PRIVATE_TARGETS=true`. |
| Login works but pages redirect to `/login` | Token expired (30 min) or `NEXT_PUBLIC_API_URL` points at the wrong host. |
| `Cannot find module 'next'` in the editor | Run `npm install` in `frontend/`, open `frontend/` as a workspace, restart the TS server. |
| `pytest` not recognized | Use `python -m pytest` inside the activated virtualenv. |

## Limitations

- CVE matching is **version-based** against a deliberately small built-in table (4 CVEs: Apache, OpenSSH, nginx, vsftpd). Distributions often backport fixes without changing the version, so results are *potential* matches, and a clean result does not prove a host is safe.
- Only the default top 1000 TCP ports are scanned; UDP and other ports are not.
- The authorization checkbox is an attestation, not proof of ownership.
- The assistant's knowledge-base search is keyword-based, so a question phrased with very different words may not attach any notes (the model still answers from its own knowledge).
- The access token is kept in `localStorage`, which is readable by scripts if the site ever has an XSS bug. An HttpOnly cookie would be stronger.
- No database migrations yet (tables are created on startup) and no login rate limiting.

## Roadmap

- Real CVE intelligence (NVD, CISA KEV, OSV) instead of the built-in table
- Alembic migrations, login rate limiting, enforced roles (admin)
- Domain-ownership verification before scanning
- Assistant that explains a user's own scan results; embedding-based retrieval; streaming answers
- Scheduled scans, charts on the dashboard, HTTPS deployment behind a reverse proxy

## License

Educational and authorized security-research use only. See [LICENSE](LICENSE).
