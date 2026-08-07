Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
startLauncher = fso.BuildPath(projectDir, "autostart-start.bat")
watchdogLauncher = fso.BuildPath(projectDir, "watchdog-hidden.vbs")
logDir = fso.BuildPath(projectDir, "logs")
logFile = fso.BuildPath(logDir, "autostart-bootstrap.log")

Sub WriteLog(message)
  If Not fso.FolderExists(logDir) Then
    fso.CreateFolder(logDir)
  End If

  Set stream = fso.OpenTextFile(logFile, 8, True)
  stream.WriteLine Year(Now) & "-" & Right("0" & Month(Now), 2) & "-" & Right("0" & Day(Now), 2) & " " & _
    Right("0" & Hour(Now), 2) & ":" & Right("0" & Minute(Now), 2) & ":" & Right("0" & Second(Now), 2) & " " & message
  stream.Close
End Sub

shell.CurrentDirectory = projectDir
WriteLog "Bootstrap started."

' Delay startup to avoid competing with other logon apps.
WScript.Sleep 180000

If fso.FileExists(startLauncher) Then
  shell.Run """" & startLauncher & """", 0, False
  WriteLog "Triggered autostart launcher."
Else
  WriteLog "Missing autostart launcher: " & startLauncher
End If

' Start watchdog after the main launcher so periodic recovery is available.
WScript.Sleep 15000

If fso.FileExists(watchdogLauncher) Then
  shell.Run "wscript.exe """ & watchdogLauncher & """", 0, False
  WriteLog "Triggered watchdog helper."
Else
  WriteLog "Missing watchdog helper: " & watchdogLauncher
End If
