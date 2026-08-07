@echo off
setlocal
cd /d "%~dp0"

set "STARTUP_TASK_NAME=UI Library Auto Start"
set "WATCHDOG_TASK_NAME=UI Library Watchdog"
set "TASK_SCRIPT=%~dp0autostart-bootstrap.vbs"
set "WATCHDOG_SCRIPT=%~dp0watchdog-launcher.js"
set "FIREWALL_SCRIPT=%~dp0setup-firewall.bat"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_WRAPPER=%STARTUP_DIR%\UICloud Auto Start.vbs"
set "RUN_KEY=HKCU\Software\Microsoft\Windows\CurrentVersion\Run"
set "RUN_VALUE=UICloudAutoStart"

echo ========================================
echo Configure Windows Startup
echo ========================================

if not exist "%TASK_SCRIPT%" (
  echo Missing file: %TASK_SCRIPT%
  pause
  exit /b 1
)

if not exist "%FIREWALL_SCRIPT%" (
  echo Missing file: %FIREWALL_SCRIPT%
  pause
  exit /b 1
)

if not exist "%WATCHDOG_SCRIPT%" (
  echo Missing file: %WATCHDOG_SCRIPT%
  pause
  exit /b 1
)

if not exist "%~dp0pm2-autostart.bat" (
  echo Missing file: %~dp0pm2-autostart.bat
  pause
  exit /b 1
)

schtasks /Delete /TN "%STARTUP_TASK_NAME%" /F >nul 2>nul
schtasks /Delete /TN "%WATCHDOG_TASK_NAME%" /F >nul 2>nul

echo Creating hidden startup task...
schtasks /Create /TN "%STARTUP_TASK_NAME%" /SC ONLOGON /RL HIGHEST /TR "wscript.exe \"\"%TASK_SCRIPT%\"\"" /F >nul
if errorlevel 1 goto :error

echo Creating watchdog task...
schtasks /Create /TN "%WATCHDOG_TASK_NAME%" /SC MINUTE /MO 5 /RL HIGHEST /TR "wscript.exe \"\"%WATCHDOG_SCRIPT%\"\"" /F >nul
if errorlevel 1 goto :error

echo Creating Startup folder backup...
if not exist "%STARTUP_DIR%" mkdir "%STARTUP_DIR%"
> "%STARTUP_WRAPPER%" echo Set shell = CreateObject("WScript.Shell")
>> "%STARTUP_WRAPPER%" echo shell.Run "wscript.exe ""%TASK_SCRIPT%""", 0, False
if errorlevel 1 goto :error

echo Creating Run registry backup...
reg add "%RUN_KEY%" /v "%RUN_VALUE%" /t REG_SZ /d "wscript.exe \"\"%TASK_SCRIPT%\"\"" /f >nul
if errorlevel 1 goto :error

echo Configuring Windows firewall...
call "%FIREWALL_SCRIPT%"
if errorlevel 1 goto :error

echo Startup configuration completed successfully.
echo The app will auto-start silently about 180 seconds after Windows login.
echo Startup now has three paths: Task Scheduler, Startup folder, and HKCU Run.
echo Watchdog will check the app every 5 minutes and auto-restart it if needed.
echo Access URL after startup: http://localhost:8000
goto :eof

:error
echo Windows startup configuration failed.
echo Please run this script as Administrator.
pause
exit /b 1
