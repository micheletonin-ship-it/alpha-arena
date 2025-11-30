@echo off
echo ===================================
echo   Alpha Arena - Arresto Servizi
echo ===================================
echo.
echo Chiusura di Node.js (Backend e Frontend)...
echo.

REM Termina tutti i processi node.exe
taskkill /F /IM node.exe /T 2>nul

if %errorlevel% == 0 (
    echo.
    echo ✓ Servizi arrestati con successo!
) else (
    echo.
    echo ℹ Nessun servizio attivo da arrestare.
)

echo.
echo ===================================
echo Fatto!
echo ===================================
echo.
pause
