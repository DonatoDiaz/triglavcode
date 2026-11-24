Option Explicit
' TriglavCode web launcher: starts `triglavcode web` hidden and opens the browser.
Dim fso, sh, dir, exe
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
exe = dir & "\triglavcode.exe"
sh.CurrentDirectory = sh.ExpandEnvironmentStrings("%USERPROFILE%")
sh.Run """" & exe & """ web", 0, False
