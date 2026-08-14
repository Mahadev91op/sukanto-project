@echo off
:: Navigate to the directory where this batch script is located
cd /d "%~dp0"

:: Start the Next.js development server in a minimized cmd window
start /min cmd /c "npm run dev"

:: Wait for 9 seconds to ensure the server is compiled and ready
timeout /t 9 /nobreak >nul

:: Launch Google Chrome in app mode pointing to localhost:3000
start chrome --app=http://localhost:3000

:: Close this batch file's command window
exit
