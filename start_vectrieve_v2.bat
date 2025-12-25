@echo off
title Vectrieve Hybrid Launcher 🚀
color 0A
cls

echo ========================================================
echo   V E C T R I E V E   H Y B R I D   S Y S T E M   v2.0
echo ========================================================
echo.
echo  [1] 🧠 Starting OLLAMA (Local Brain)...
start "OLLAMA SERVICE" /min cmd /k "ollama serve"

echo.
echo  [2] ⚙️ Starting BACKEND (Python API)...
:: Заходимо в папку, активуємо віртуальне середовище з кореня, запускаємо
start "BACKEND - PYTHON" cmd /k "cd backend && ..\venv\Scripts\activate && python main.py"

echo.
echo  [3] 🎨 Starting FRONTEND (Next.js UI)...
:: Заходимо в правильну папку vectrieve-ui
start "FRONTEND - NEXTJS" cmd /k "cd vectrieve-ui && npm run dev"

echo.
echo ========================================================
echo   🚀 LAUNCHING COMPLETE!
echo   Opening browser in 5 seconds...
echo ========================================================

:: Чекаємо 5 секунд, щоб сервери встигли прокинутись
timeout /t 5 >nul
start http://localhost:3000

echo.
echo   Press any key to KILL ALL PROCESSES and close Vectrieve.
pause >nul

:: --- KILL SWITCH (Коли натиснеш кнопку в цьому вікні) ---
echo.
echo   🔻 SHUTTING DOWN SYSTEM...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM ollama.exe /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq BACKEND - PYTHON" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq FRONTEND - NEXTJS" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq OLLAMA SERVICE" /F >nul 2>&1
echo   ✅ System stopped. Bye!
timeout /t 2 >nul
exit