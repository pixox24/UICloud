var shell = new ActiveXObject("WScript.Shell");
var fso = new ActiveXObject("Scripting.FileSystemObject");

var projectDir = fso.GetParentFolderName(WScript.ScriptFullName);
var scriptPath = fso.BuildPath(projectDir, "watchdog.ps1");
var command = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + scriptPath + '"';

shell.CurrentDirectory = projectDir;
shell.Run(command, 0, false);
