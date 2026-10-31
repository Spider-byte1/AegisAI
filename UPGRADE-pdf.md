# PDF summary report - how to apply

Copy this zip over your project root (choose "Replace"). Nothing needs deleting. No database change.

## 1. Backend: one dev-only package (used by the tests), then restart
    pip install -r requirements-dev.txt
Restart uvicorn AND the Celery worker (both load the new report code).

## 2. Frontend: no new packages. Restart `npm run dev` and hard-refresh (Ctrl+Shift+R).

## 3. Use it
- Finish a scan -> click "Download PDF report" in the result panel.
- Any completed scan in "Recent Scans" has a "PDF" button.
Old scans work too: the report is rebuilt from the saved results on every download.

## Where the file is
backend\app\reports\scan_<id>.pdf (created/refreshed when you download). It is safe to delete them.

## Check
    cd backend ; python -m pytest        # 118 tests
