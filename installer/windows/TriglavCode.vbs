Option Explicit
' TriglavCode web launcher: runs TriglavCode-run.cmd hidden (logs to %LOCALAPPDATA%\TriglavCode\web.log).
Dim fso, sh, dir, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = sh.ExpandEnvironmentStrings("%USERPROFILE%")
cmd = "cmd /c """ & dir & "\TriglavCode-run.cmd"""
sh.Run cmd, 0, False
