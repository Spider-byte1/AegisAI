# AegisAI - complete project (replaces the three earlier update zips)

This zip contains EVERY source file of the project in its current state, so you no longer
have to apply the earlier updates in order. It does NOT contain your secrets or generated
files: backend/.env, databases, logs, PDFs, node_modules and .venv are untouched.

## 1. Back up, then extract over your project root (choose "Replace")
    git add -A ; git commit -m "Before complete update"
    Expand-Archive "$HOME\Downloads\AegisAI-complete.zip" -DestinationPath . -Force

## 2. Delete files the new code no longer uses
    Remove-Item -ErrorAction SilentlyContinue backend\text.py, backend\app\api\status.py, backend\app\models\scan_history.py, backend\app\services\background_worker.py, backend\app\services\dashboard_service.py, backend\app\services\history_service.py, backend\app\services\risk_service.py, backend\app\services\scan_service.py

## 3. Check the files landed (every line must say True)
    "frontend\lib\api.ts","frontend\app\login\page.tsx","frontend\components\AssistantWidget.tsx","backend\app\rag\retriever.py","backend\scripts\reset_db.py","requirements-dev.txt","backend\Dockerfile" | % { "{0,-40} {1}" -f $_, (Test-Path $_) }

## 4. Configure, install, reset the database
In backend\.env set a real SECRET_KEY (32+ random characters, not a placeholder):
    python -c "import secrets; print(secrets.token_urlsafe(48))"
Then, with your virtualenv active:
    pip install -r requirements-dev.txt
    cd backend
    python -m scripts.reset_db --yes        # tables changed shape; this deletes dev data
    python -m pytest                        # 96 tests should pass

## 5. Run
    uvicorn app.main:app --reload                                  (backend/)
    celery -A app.worker.celery_app worker --loglevel=info -P solo (backend/, second terminal; Redis must be running)
    npm install ; npm run dev                                      (frontend/)
