@echo off
title GLS Padroncini

cd /d "%~dp0"

:: Controlla node_modules
if not exist "node_modules\" (
    echo ATTENZIONE: Eseguire prima SETUP.bat
    echo.
    pause
    exit /b 1
)

echo ============================================
echo       AVVIO APPLICAZIONE GLS PADRONCINI
echo ============================================
echo.
echo Seleziona modalita di avvio:
echo [1] Modalita Sviluppo (hot reload, per test)
echo [2] Modalita Produzione (build statica)
echo.
set /p MODE=Scelta [1/2]: 

if "%MODE%"=="1" goto DEV
if "%MODE%"=="2" goto PROD

echo Scelta non valida.
pause
exit /b 1

:DEV
echo.
echo Avvio in modalita SVILUPPO...
echo Attendere 30-60 secondi per la prima compilazione...
set ELECTRON_DEV=1
npx concurrently "npx react-scripts start" "npx wait-on http://localhost:3000 && npx electron ."
exit /b

:PROD
echo.
:: Controlla se build esiste
if not exist "build\index.html" (
    echo ATTENZIONE: La build non esiste. Eseguo build automatica...
    call npm run build
)
echo Avvio in modalita PRODUZIONE...
npx electron .
exit /b