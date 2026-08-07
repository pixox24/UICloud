$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$lockName = "Global\UICloudWatchdog"
$mutex = New-Object System.Threading.Mutex($false, $lockName)
$hasLock = $false

if (-not $mutex.WaitOne(0)) {
  exit 0
}

$hasLock = $true

function Write-WatchdogLog {
  param([string]$Message)

  $logDir = Join-Path $projectDir "logs"
  $logFile = Join-Path $logDir "watchdog.log"

  if (-not (Test-Path -LiteralPath $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  }

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -LiteralPath $logFile -Value "$timestamp $Message"
}

function Test-AppHealthy {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8000" -TimeoutSec 5
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Get-NextProcess {
  Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "node.exe" -and $_.CommandLine -like "*next*" -and $_.CommandLine -like "*start*" -and $_.CommandLine -like "*8000*"
  }
}

function Start-Recovery {
  $pm2Launcher = Join-Path $projectDir "pm2-autostart.bat"
  $legacyLauncher = Join-Path $projectDir "start-next-now.vbs"

  if (Test-Path -LiteralPath $pm2Launcher) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$pm2Launcher`"" -WindowStyle Hidden
    Write-WatchdogLog "Triggered PM2 recovery."
    return
  }

  if (Test-Path -LiteralPath $legacyLauncher) {
    Start-Process -FilePath "wscript.exe" -ArgumentList "`"$legacyLauncher`"" -WindowStyle Hidden
    Write-WatchdogLog "Triggered legacy hidden restart."
    return
  }

  Write-WatchdogLog "No recovery launcher found."
}

try {
  if (Test-AppHealthy) {
    exit 0
  }

  Write-WatchdogLog "Health check failed. Starting recovery."

  $existingProcesses = Get-NextProcess
  foreach ($process in $existingProcesses) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
      Write-WatchdogLog "Stopped stale process PID $($process.ProcessId)."
    } catch {
      Write-WatchdogLog "Failed to stop process PID $($process.ProcessId): $($_.Exception.Message)"
    }
  }

  Start-Recovery
} catch {
  Write-WatchdogLog "Watchdog error: $($_.Exception.Message)"
} finally {
  if ($hasLock -and $mutex) {
    $mutex.ReleaseMutex()
  }

  if ($mutex) {
    $mutex.Dispose()
  }
}
