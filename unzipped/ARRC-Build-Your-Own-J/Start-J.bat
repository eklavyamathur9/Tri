@echo off
title J
cd /d "%~dp0arrc"
rem Find Node.js and cloudflared even right after installing them (no need to reopen the window).
set "PATH=%PATH%;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\cloudflared;%ProgramFiles%\cloudflared"

echo.
echo   Starting J...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   Installing Node.js, a free tool J needs. If Windows asks, click Yes.
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  where node >nul 2>nul || (echo. & echo   Node.js didn't install. Get it from https://nodejs.org, then double-click Start-J.bat again. & pause & exit /b 1)
)

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo   Installing cloudflared, a free tool that connects J to your phone. If Windows asks, click Yes.
  winget install -e --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
  where cloudflared >nul 2>nul || (echo. & echo   cloudflared didn't install. Close this window and double-click Start-J.bat again. & pause & exit /b 1)
)

if not exist node_modules (
  echo   Getting J ready for the first time, this takes a minute...
  call npm install --no-audit --no-fund >nul 2>nul || (echo   That didn't work. Check your internet and try again. & pause & exit /b 1)
)

if not exist .env (
  echo.
  echo   One question, then J is ready.
  node setup.js || (pause & exit /b 1)
  echo.
  echo   Next: open Copy-for-Sarvam.bat to copy each thing into the Sarvam website.
  echo.
)

node start.js
pause
