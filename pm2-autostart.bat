@echo off
setlocal
cd /d "%~dp0"

set "PM2_HOME=%~dp0.pm2"
set "PM2_CMD="
set "LOG_DIR=%~dp0logs"
set "LOG_FILE=%LOG_DIR%\pm2-autostart.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

call :log PM2 autostart begin

for /f "delims=" %%i in ('where pm2.cmd 2^>nul') do (
  set "PM2_CMD=%%i"
  goto :pm2_found
)

for /f "usebackq delims=" %%i in (`npm.cmd prefix -g 2^>nul`) do set "NPM_PREFIX=%%i"
if defined NPM_PREFIX if exist "%NPM_PREFIX%\pm2.cmd" set "PM2_CMD=%NPM_PREFIX%\pm2.cmd"

:pm2_found
if not defined PM2_CMD (
  call :log PM2 is not installed.
  echo PM2 is not installed. Run: npm install -g pm2
  exit /b 1
)

call :log Running production build.
call npm.cmd run build >> "%LOG_FILE%" 2>&1
if errorlevel 1 (
  call :log Production build failed.
  exit /b 1
)

call :log Starting or restarting PM2 app.
call "%PM2_CMD%" startOrRestart ecosystem.config.js --update-env
if errorlevel 1 (
  call :log PM2 startOrRestart failed.
  exit /b 1
)

call :log Saving PM2 process list.
call "%PM2_CMD%" save
if errorlevel 1 (
  call :log PM2 save failed.
  exit /b 1
)

call :log PM2 autostart finished successfully.
exit /b 0

:log
echo [%date% %time%] %*>> "%LOG_FILE%"
exit /b 0
