Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
launcher = fso.BuildPath(projectDir, "start-next-hidden.vbs")

shell.CurrentDirectory = projectDir
shell.Run "wscript.exe """ & launcher & """", 0, False
