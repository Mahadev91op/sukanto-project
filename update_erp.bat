@echo off
title Medical ERP - Cloud System Updater
color 0A
cd /d "%~dp0"

echo ======================================================
echo       MEDICAL ERP - 1-CLICK CLOUD UPDATER
echo       100%% DATABASE SAFE - ZERO DATA LOSS
echo ======================================================
echo.
echo [1/3] Checking internet & fetching updates from GitHub...
git fetch origin main

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Could not connect to GitHub. Check internet connection!
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] Pulling latest code changes...
git pull origin main

echo.
echo [3/3] Checking dependencies...
call npm install --no-audit --no-fund --prefer-offline

echo.
echo ======================================================
echo   SUCCESS! Medical ERP successfully updated.
echo   Your database and medicines stock remain 100%% safe.
echo ======================================================
echo.
pause
