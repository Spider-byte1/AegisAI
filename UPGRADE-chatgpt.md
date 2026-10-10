# ChatGPT-style Security Assistant - how to apply

Copy this zip over your project root (choose "Replace"). No files need deleting.

## 1. Frontend: one new dependency (Markdown rendering)
    cd frontend
    npm install

## 2. Backend: nothing new to install. Restart it.

## 3. IMPORTANT - turn on the AI
Chat-style answers need an API key. Without one the popup still shows knowledge-base passages, as before.
Create a key in the Claude Console (platform.claude.com -> API keys) and add to backend\.env:

    ANTHROPIC_API_KEY=your-key-here
    # optional
    LLM_MODEL=claude-haiku-4-5-20251001     # fast and cheap; a larger model (e.g. claude-sonnet-5-5) answers better
    ASSISTANT_SCOPE=cybersecurity           # or: general  (answer any topic)
    RAG_MAX_QUESTIONS_PER_HOUR=30           # per user; protects your API bill

API usage is billed separately from a claude.ai subscription. Never commit backend\.env.
Restart uvicorn after editing it.

## 4. Check
    cd backend ; python -m pytest           # 96 tests
    cd ..\frontend ; npm run build
Then hard-refresh the browser (Ctrl+Shift+R) and open the chat bubble.
