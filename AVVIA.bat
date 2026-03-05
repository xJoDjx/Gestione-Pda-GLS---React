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

:: Avvio produzione se build esiste
if exist "build\index.html" (
    echo Avvio GLS Padroncini...
    npx electron ./electron/main.js
) else (
    echo Build non trovata. Avvio in modalita sviluppo...
    echo Attendere 30-60 secondi per la prima compilazione...
    set ELECTRON_DEV=1
    npx concurrently "npx react-scripts start" "npx wait-on http://localhost:3000 && npx electron ./electron/main.js"
)
