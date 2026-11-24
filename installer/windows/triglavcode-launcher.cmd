@echo off
setlocal enableextensions
rem TriglavCode launcher: opens the TUI (in Windows Terminal when available).
set "HERE=%~dp0"
set "TC=%HERE%triglavcode.exe"

if not exist "%TC%" (
  echo [TriglavCode] triglavcode.exe was not found next to this launcher.
  echo [TriglavCode] Please reinstall TriglavCode.
  pause
  exit /b 1
)

rem Already inside Windows Terminal: run in the current tab.
if defined WT_SESSION (
  "%TC%" %*
  exit /b %errorlevel%
)

rem Prefer Windows Terminal in a new window, fall back to the current console.
where wt.exe >nul 2>nul
if %errorlevel%==0 (
  start "" wt.exe -d "%CD%" "%TC%" %*
  exit /b 0
)

"%TC%" %*
exit /b %errorlevel%
