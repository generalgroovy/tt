@echo off
setlocal
title Relay Rift Super-Duper Alpha
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run Relay Rift.
  echo Install Node.js LTS from: https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
echo Starting Relay Rift...
echo Open http://localhost:8080 if the browser does not open automatically.
start "" http://localhost:8080
npm start
pause
