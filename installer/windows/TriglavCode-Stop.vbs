Option Explicit
' Stops the hidden TriglavCode web server.
Dim sh
Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c taskkill /IM triglavcode.exe /F >nul 2>&1", 0, False
