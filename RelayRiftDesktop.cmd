@echo off
cd /d "%~dp0"
py -3 relay_rift_app.py
if errorlevel 1 python relay_rift_app.py
pause
