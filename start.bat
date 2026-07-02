@echo off
setlocal EnableDelayedExpansion
title sAgent Quick Start
cd /d D:\atmow\sagent

echo ============================================
echo   sAgent Quick Start (Dev Watch + Turbopack)
echo   Web: http://localhost:4000
echo   API: http://localhost:4001/api/v1
echo ============================================
echo.

REM ===== Step 1: Clean ports 4000 / 4001 =====
echo [1/4] Cleaning ports 4000 and 4001 ...
for %%P in (4000 4001) do (
    for /f "tokens=5" %%A in ('netstat -ano 2^>nul ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        taskkill /F /PID %%A >nul 2>&1
        echo   killed PID %%A on port %%P
    )
)
echo   done.
echo.

REM ===== Step 2: Skip nest build, use dev watch directly =====
echo [2/4] Starting API in dev watch mode (skip nest build) ...
start "sAgent-API" cmd /k "cd /d D:\atmow\sagent && pnpm --filter @sagent/api dev"

REM ===== Step 3: Start Web with Turbopack =====
echo [3/4] Starting Web (next dev --turbopack) ...
start "sAgent-Web" cmd /k "cd /d D:\atmow\sagent && pnpm --filter @sagent/web dev"
echo.

REM ===== Step 4: Wait for both services (max 180s) =====
echo [4/4] Waiting for services to be ready ...
set "API_READY=0"
set "WEB_READY=0"
set /a "TIMEOUT=180"
set /a "ELAPSED=0"

:WAIT_LOOP
if !API_READY!==0 (
    netstat -ano 2>nul | findstr ":4001 " | findstr "LISTENING" >nul && (
        set "API_READY=1"
        echo   [!ELAPSED!s] API ready on port 4001
    )
)
if !WEB_READY!==0 (
    netstat -ano 2>nul | findstr ":4000 " | findstr "LISTENING" >nul && (
        set "WEB_READY=1"
        echo   [!ELAPSED!s] Web ready on port 4000
    )
)

if !API_READY!==1 if !WEB_READY!==1 goto :ALL_READY
set /a "ELAPSED+=1"
if !ELAPSED! geq !TIMEOUT! goto :TIMEOUT
timeout /t 1 /nobreak >nul
goto :WAIT_LOOP

:ALL_READY
echo.
echo ============================================
echo   Both services are READY!
echo   Web:  http://localhost:4000
echo   API:  http://localhost:4001/api/v1
echo   Docs: http://localhost:4001/docs
echo ============================================
echo.
echo Opening browser ...
timeout /t 2 /nobreak >nul
start "" http://localhost:4000
goto :END

:TIMEOUT
echo.
echo [WARNING] Timeout after %TIMEOUT% seconds.
if !API_READY!==0 echo   - API (port 4001) NOT ready
if !WEB_READY!==0 echo   - Web (port 4000) NOT ready
echo.
echo Check the sAgent-API / sAgent-Web windows for errors.
echo.

:END
endlocal
