@echo off
chcp 65001 >nul
title Bestandsliste Kommissionierung (Test)
cd /d "%~dp0"
if not exist "programm\python\python.exe" (
  echo Das Paket ist nicht entpackt. Bitte die ZIP-Datei zuerst mit "Alle extrahieren" entpacken.
  pause
  exit /b 1
)
"programm\python\python.exe" -I -X utf8 "programm\start.py"
echo.
echo Die App wurde beendet.
pause
