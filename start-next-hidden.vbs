Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = "F:\node-v22.0.0-win-x64\node.exe"
nextCli = fso.BuildPath(projectDir, "node_modules\next\dist\bin\next")
command = """" & nodeExe & """ """ & nextCli & """ start --hostname 0.0.0.0 --port 8000"

shell.CurrentDirectory = projectDir
WScript.Sleep 10000
shell.Run command, 0, False
