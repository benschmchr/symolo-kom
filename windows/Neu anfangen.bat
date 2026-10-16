@echo off
chcp 65001 >nul
title Testdaten loeschen
cd /d "%~dp0"
echo Alle Testdaten in diesem Paket werden geloescht (Mengen, Lagerorte, Importe).
echo Beim naechsten Start laedt die App wieder die Beispiel-Listen.
echo Vorher die App schliessen.
echo.
set /p ANTWORT=Wirklich loeschen? (j/n): 
if /i not "%ANTWORT%"=="j" exit /b 0
if exist "daten" rmdir /s /q "daten"
echo Erledigt.
pause
