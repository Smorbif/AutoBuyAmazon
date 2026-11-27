@echo off
set "FILE=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\KeepaBuyer.vbs"
if exist "%FILE%" (
  del "%FILE%"
  echo Avvio automatico disattivato.
) else (
  echo L'avvio automatico non era attivo.
)
pause
