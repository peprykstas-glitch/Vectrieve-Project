@echo off
title CoreMind Launcher
color 0A
cls

echo ========================================================
echo   C O R E M I N D   S Y S T E M   v2.0
echo ========================================================
echo.
echo  [1] Starting Qdrant (Docker)...
start "QDRANT" /min cmd /k "cd /d "%~dp0" && docker-compose up"

echo.
echo  [2] Starting BACKEND (Python API)...
start "BACKEND - PYTHON" cmd /k "cd /d "%~dp0backend\app-backend" && ..\venv\Scripts\activate && python main.py"

echo.
echo  [3] Starting FRONTEND (Next.js UI)...
start "FRONTEND - NEXTJS" cmd /k "cd /d "%~dp0vectrieve-frontend" && npm run dev"

echo.
echo ========================================================
echo   LAUNCHING COMPLETE!
echo   Opening browser in 8 seconds...
echo ========================================================

:: Wait for servers to start
timeout /t 8 >nul
start http://localhost:3000

echo.
echo   Press any key to KILL ALL PROCESSES and close CoreMind.
pause >nul

:: --- KILL SWITCH ---
echo.
echo   SHUTTING DOWN SYSTEM...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM uvicorn.exe /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq BACKEND - PYTHON" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq FRONTEND - NEXTJS" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq QDRANT" /F >nul 2>&1
echo   System stopped. Bye!
timeout /t 2 >nul
exit