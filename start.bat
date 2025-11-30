@echo off
echo ===================================
echo   Alpha Arena - Avvio Completo
echo ===================================
echo.
echo Avvio Backend e Frontend...
echo.

REM Apre una nuova finestra per il backend
start "Alpha Arena Backend" cmd /k "cd backend && npm run dev"

REM Aspetta 2 secondi prima di avviare il frontend
timeout /t 2 /nobreak > nul

REM Apre una nuova finestra per il frontend
start "Alpha Arena Frontend" cmd /k "npm run dev"

echo.
echo ===================================
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo ===================================
echo.
echo Le finestre sono state aperte!
echo Puoi chiudere questa finestra.
echo.
pause
