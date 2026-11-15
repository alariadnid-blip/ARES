@echo off
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required to open ARES.
  echo Install Node.js, then double-click this file again.
  pause
  exit /b 1
)

npm run dev -- --open
if errorlevel 1 pause
