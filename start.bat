@echo off
setlocal
cd /d "%~dp0"
set "APP_PORT=9000"

echo ========================================
echo UI Library Windows Startup
echo ========================================

echo [1/8] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Please install Node.js 20 or later first.
  pause
  exit /b 1
)
for /f "delims=" %%i in ('node -v') do set NODE_VERSION=%%i
echo Detected Node.js %NODE_VERSION%

echo [2/8] Installing dependencies...
call npm install
if errorlevel 1 goto :error

echo [3/8] Checking preview tools...
set "HAS_MAGICK=0"
set "HAS_GS=0"
where magick >nul 2>nul && set "HAS_MAGICK=1"
where gswin64c >nul 2>nul && set "HAS_GS=1"
if "%HAS_GS%"=="0" (
  where gswin32c >nul 2>nul && set "HAS_GS=1"
)
if "%HAS_GS%"=="0" (
  where gs >nul 2>nul && set "HAS_GS=1"
)
if "%HAS_MAGICK%"=="1" (
  echo ImageMagick detected.
) else (
  echo Warning: ImageMagick not found. PSD/AI/EPS/PDF preview extraction will be unavailable.
)
if "%HAS_GS%"=="1" (
  echo Ghostscript detected.
) else (
  echo Warning: Ghostscript not found. AI/EPS/PDF preview extraction will be unavailable.
)

echo [4/8] Initializing database...
call npm run db:init
if errorlevel 1 goto :error

echo [5/8] Ensuring uploads folders exist...
if not exist "uploads" mkdir "uploads"
if not exist "uploads\assets" mkdir "uploads\assets"
if not exist "uploads\thumbnails" mkdir "uploads\thumbnails"
if not exist "uploads\thumbnails\original" mkdir "uploads\thumbnails\original"
if not exist "uploads\thumbnails\large" mkdir "uploads\thumbnails\large"
if not exist "uploads\thumbnails\medium" mkdir "uploads\thumbnails\medium"
if not exist "uploads\thumbnails\small" mkdir "uploads\thumbnails\small"

echo [6/8] Building application...
call npm run build
if errorlevel 1 goto :error

echo [7/8] Detecting LAN IP...
set "LAN_IP="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$ip = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } | ForEach-Object { $_.IPv4Address.IPAddress } | Select-Object -First 1; if (-not $ip) { $ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254*' } | Select-Object -First 1 -ExpandProperty IPAddress }; Write-Output $ip"`) do set "LAN_IP=%%i"
if not defined LAN_IP set "LAN_IP=127.0.0.1"
echo Local URL: http://localhost:%APP_PORT%
echo Team access URL: http://%LAN_IP%:%APP_PORT%

echo [8/8] Starting application on 0.0.0.0:%APP_PORT%...
call npm run start:lan
goto :eof

:error
echo Startup failed. Please review the error above.
pause
exit /b 1
