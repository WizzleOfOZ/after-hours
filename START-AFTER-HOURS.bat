@echo off
setlocal
cd /d "%~dp0"
title AFTER HOURS - Date Night Server
where node >nul 2>&1
if errorlevel 1 (
 echo.
 echo Node.js is not installed or has not been added to PATH.
 echo Download the Node.js LTS version from https://nodejs.org/
 echo Then close this window and double-click START-AFTER-HOURS.bat again.
 echo.
 pause
 exit /b 1
)
echo.
echo ============================================
echo  AFTER HOURS - PRIVATE DATE NIGHT
 echo ============================================
echo.
echo Open http://localhost:3000 in your browser.
echo Keep this window open while you and Kris play.
echo Press CTRL+C to end the server.
echo.
npm start
pause
