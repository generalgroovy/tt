@echo off
setlocal
title Relay Rift Public Internet Host
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run Relay Rift.
  echo Install Node.js LTS from: https://nodejs.org/
  pause
  exit /b 1
)
if not exist tools mkdir tools
if not exist tools\cloudflared.exe (
  echo cloudflared.exe missing. Downloading one-file tunnel helper...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'tools\\cloudflared.exe'"
)
node launcher.mjs --public
pause
