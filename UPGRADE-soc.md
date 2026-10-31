# SOC command center - how to apply

1. Copy this zip over your project root (choose "Replace").
2. Frontend: `cd frontend` then `npm install` (new: lucide-react, topojson-client, world-atlas, test tooling), then `npm test`.
3. Backend: nothing new to install. Restart uvicorn AND the Celery worker (scan stages changed). `cd backend` then `python -m pytest` (172 tests).
4. Hard-refresh the browser (Ctrl+Shift+R). Sound is off by default: use the speaker button in the top bar.

No database change. The threat map is SIMULATED demo data and is switched off until you turn it on.
