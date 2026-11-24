@echo off
setlocal
set "APPDIR=%~dp0"
set "LOGDIR=%LOCALAPPDATA%\TriglavCode"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1
echo [%DATE% %TIME%] starting: "%APPDIR%triglavcode.exe" web>> "%LOGDIR%\web.log" 2>&1
"%APPDIR%triglavcode.exe" web >> "%LOGDIR%\web.log" 2>&1
echo [%DATE% %TIME%] exited with code %ERRORLEVEL%>> "%LOGDIR%\web.log"
