@echo off
rem Avvia Keepa Buyer in background a ogni accesso a Windows (senza aprire il pannello).
setlocal
set "DIR=%~dp0"
if "%DIR:~-1%"=="\" set "DIR=%DIR:~0,-1%"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if not exist "%DIR%\KeepaBuyer.exe" (
  echo Non trovo KeepaBuyer.exe in "%DIR%".
  pause
  exit /b 1
)
> "%STARTUP%\KeepaBuyer.vbs" echo Set s = CreateObject("WScript.Shell"): s.Environment("Process")("KEEP_BUY_NO_OPEN") = "1": s.CurrentDirectory = "%DIR%": WScript.Sleep 20000: s.Run """%DIR%\KeepaBuyer.exe""", 0, False
if errorlevel 1 (
  echo Impossibile creare il collegamento di avvio automatico.
  pause
  exit /b 1
)
echo Avvio automatico attivato: Keepa Buyer partira' 20 secondi dopo ogni accesso a Windows,
echo con il monitoraggio gia' attivo. Il pannello resta su http://127.0.0.1:8788
echo Per disattivarlo usa "Disattiva avvio automatico.cmd".
pause
