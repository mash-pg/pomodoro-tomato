@echo off
echo Starting Next.js development server...
start cmd /k "npm run dev"
timeout /t 5 >nul
echo Opening browser...
start http://localhost:3000
echo Server and browser launched.
echo You can close this window.
