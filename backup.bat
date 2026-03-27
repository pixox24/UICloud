@echo off
setlocal
cd /d "%~dp0"

set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Date -Format 'yyyy-MM-dd'"`) do set "BACKUP_DATE=%%i"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "BACKUP_DIR=%DESKTOP_DIR%\UILibrary_Backup"
set "BACKUP_FILE=%BACKUP_DIR%\backup-%BACKUP_DATE%.zip"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Creating backup: %BACKUP_FILE%
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$projectRoot = '%PROJECT_ROOT%';" ^
  "$backupFile = '%BACKUP_FILE%';" ^
  "$dataDir = Join-Path $projectRoot 'data';" ^
  "$uploadsDir = Join-Path $projectRoot 'uploads';" ^
  "$items = @();" ^
  "if (Test-Path $dataDir) { $items += Get-ChildItem -Path $dataDir -Filter 'assets.db*' | Select-Object -ExpandProperty FullName };" ^
  "if (Test-Path $uploadsDir) { $items += $uploadsDir };" ^
  "if (-not $items.Count) { throw 'No database file or uploads folder found.' }" ^
  "Compress-Archive -Path $items -DestinationPath $backupFile -Force"

if errorlevel 1 (
  echo Backup failed.
  pause
  exit /b 1
)

echo Backup completed: %BACKUP_FILE%
