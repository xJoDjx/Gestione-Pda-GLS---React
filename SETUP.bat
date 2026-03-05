@echo off
title GLS Padroncini - Setup

cd /d "%~dp0"

echo.
echo  ======================================
echo    GLS PADRONCINI - SETUP v2.0
echo  ======================================
echo.

:: Rimuovi vecchi moduli se presenti
if exist "node_modules\" (
    echo Rimozione vecchi moduli...
    rmdir /s /q node_modules
    echo Fatto.
    echo.
)

:: Verifica Node.js
echo Passo 1 di 3 - Verifica Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERRORE: Node.js non trovato!
    echo Scarica e installa Node.js LTS da: https://nodejs.org
    echo.
    pause
    exit /b 1
)
echo Node.js trovato:
node --version
echo.

:: Installa dipendenze
echo Passo 2 di 3 - Installazione dipendenze npm...
echo Attendere 1-3 minuti, non chiudere la finestra...
echo.
call npm install
if %errorlevel% neq 0 (
    echo.
    echo ERRORE: npm install fallito!
    echo Controlla la connessione internet e riprova.
    echo.
    pause
    exit /b 1
)
echo.
echo Dipendenze installate con successo!
echo.

:: Compila React
echo Passo 3 di 3 - Compilazione app React...
echo Attendere 1-2 minuti, non chiudere la finestra...
echo.
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERRORE: Compilazione fallita!
    echo.
    pause
    exit /b 1
)
echo.
echo Compilazione completata!
echo.

echo  ======================================
echo    SETUP COMPLETATO con successo!
echo    Usa AVVIA.bat per aprire il programma
echo  ======================================
echo.
pause
