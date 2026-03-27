@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo Configure PM2 Startup on Windows
echo ========================================

where pm2 >nul 2>nul
if errorlevel 1 (
  echo PM2 is not installed. Run: npm install -g pm2 pm2-windows-startup
  pause
  exit /b 1
)

where pm2-startup >nul 2>nul
if errorlevel 1 (
  echo pm2-startup is not installed. Run: npm install -g pm2 pm2-windows-startup
  pause
  exit /b 1
)

echo Starting or refreshing application with PM2...
call pm2 startOrRestart ecosystem.config.js
if errorlevel 1 goto :error

echo Saving current PM2 process list...
call pm2 save
if errorlevel 1 goto :error

echo Installing Windows startup entry...
call pm2-startup install
if errorlevel 1 goto :error

echo Startup configuration completed successfully.
echo Restart the computer once to verify PM2 auto-starts the app.
goto :eof

:error
echo PM2 startup configuration failed.
pause
exit /b 1
