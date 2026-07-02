@echo off
setlocal EnableDelayedExpansion
cd /d D:\atmow\sagent

echo [1/3] Cleaning ports 4000 and 4001 ...
powershell -NoProfile -Command "4000,4001 | ForEach-Object { $p=$_; Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
echo   done.

echo [2/3] Starting API in dev watch mode (skip nest build) ...
start "sAgent-API" cmd /k "cd /d D:\atmow\sagent && pnpm --filter @sagent/api dev"
echo   API started (port 4001).

echo [3/3] Starting Web (next dev --turbopack) ...
start "sAgent-Web" cmd /k "cd /d D:\atmow\sagent && pnpm --filter @sagent/web dev"
echo   Web started (port 4000).

echo.
echo ============================================
echo   Services are starting in separate windows.
echo   API:  http://localhost:4001/api/v1
echo   Web:  http://localhost:4000
echo   Docs: http://localhost:4001/docs
echo ============================================
echo.
echo Opening browser in 5 seconds ...
ping -n 6 127.0.0.1 >nul
start "" http://localhost:4000
endlocal
