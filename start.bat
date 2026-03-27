@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo UI Library Windows Startup
echo ========================================

echo [1/7] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Please install Node.js 20 or later first.
  pause
  exit /b 1
)
for /f "delims=" %%i in ('node -v') do set NODE_VERSION=%%i
echo Detected Node.js %NODE_VERSION%

echo [2/7] Installing dependencies...
call npm install
if errorlevel 1 goto :error

echo [3/7] Initializing database...
call npm run db:init
if errorlevel 1 goto :error

echo [4/7] Ensuring uploads folders exist...
if not exist "uploads" mkdir "uploads"
if not exist "uploads\assets" mkdir "uploads\assets"
if not exist "uploads\thumbnails" mkdir "uploads\thumbnails"
if not exist "uploads\thumbnails\original" mkdir "uploads\thumbnails\original"
if not exist "uploads\thumbnails\large" mkdir "uploads\thumbnails\large"
if not exist "uploads\thumbnails\medium" mkdir "uploads\thumbnails\medium"
if not exist "uploads\thumbnails\small" mkdir "uploads\thumbnails\small"

echo [5/7] Building application...
call npm run build
if errorlevel 1 goto :error

echo [6/7] Detecting LAN IP...
set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } | ForEach-Object { $_.IPv4Address.IPAddress } | Select-Object -First 1; if (-not $ip) { $ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254*' } | Select-Object -First 1 -ExpandProperty IPAddress }; Write-Output $ip"`) do set "LAN_IP=%%i"
if not defined LAN_IP set "LAN_IP=127.0.0.1"
echo Team access URL: http://%LAN_IP%:3000

echo [7/7] Starting application on 0.0.0.0:3000...
call npm run start:lan
goto :eof

:error
echo Startup failed. Please review the error above.
pause
exit /b 1
