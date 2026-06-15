@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Install Node.js first: https://nodejs.org/& pause & exit /b 1)
if not exist node_modules call npm install
npm start
pause
