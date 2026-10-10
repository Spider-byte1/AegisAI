# Security Assistant as a popup - how to apply

Copy this zip over your project root (choose "Replace"), then delete the old page:

    Remove-Item -Recurse -Force frontend\app\assistant

Check (both must say True):

    "frontend\components\AssistantWidget.tsx","frontend\app\page.tsx" | % { "{0,-45} {1}" -f $_, (Test-Path $_) }
    -not (Test-Path frontend\app\assistant)

Then restart `npm run dev` in frontend/ and hard-refresh the browser (Ctrl+Shift+R).
The chat bubble appears in the bottom-right corner of the dashboard. No backend change.
