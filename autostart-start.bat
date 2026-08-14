@echo off
setlocal
cd /d "%~dp0"

set "LOG_DIR=%~dp0logs"
set "LOG_FILE=%LOG_DIR%\autostart-start.log"
set "LAUNCHER=%~dp0start-next-now.vbs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

call :log Autostart start begin.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:9000' -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if not errorlevel 1 (
  call :log App already healthy. Skip start.
  exit /b 0
)

call :log Stopping stale next start processes.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*UICloud*' -and $_.CommandLine -like '*next*' -and $_.CommandLine -like '*start*' -and $_.CommandLine -like '*9000*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >> "%LOG_FILE%" 2>&1

if not exist ".next\BUILD_ID" (
  call :log Missing production build. Running npm run build.
  call npm.cmd run build >> "%LOG_FILE%" 2>&1
  if errorlevel 1 (
    call :log Build failed.
    exit /b 1
  )
) else (
  call :log Production build already present.
)

if not exist "%LAUNCHER%" (
  call :log Missing launcher %LAUNCHER%.
  exit /b 1
)

call :log Launching hidden next server.
wscript.exe "%LAUNCHER%"
call :log Launch command dispatched.
exit /b 0

:log
echo [%date% %time%] %*>> "%LOG_FILE%"
exit /b 0
