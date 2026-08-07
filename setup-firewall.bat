@echo off
setlocal
cd /d "%~dp0"

set "RULE_NAME=UI Library Port 8000"

echo ========================================
echo Configure Windows Firewall
echo ========================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ruleName = '%RULE_NAME%';" ^
  "$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue;" ^
  "if ($existing) { $existing | Remove-NetFirewallRule | Out-Null };" ^
  "New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8000 -Profile Private,Domain -RemoteAddress LocalSubnet | Out-Null"

if errorlevel 1 (
  echo Windows firewall configuration failed.
  echo Please run this script as Administrator.
  pause
  exit /b 1
)

echo Firewall rule created successfully.
echo Allowed inbound TCP 8000 for local network access.
exit /b 0
