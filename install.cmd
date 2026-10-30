@echo off
rem ---------------------------------------------------------------------------
rem One-command installer for Windows.
rem Humans do not need to read this; agents read AGENTS.md and run it.
rem It does one thing: locate a usable node.exe, then hand over to install.mjs.
rem
rem Keep this file pure ASCII. cmd.exe on a Chinese Windows uses code page 936
rem and will mangle UTF-8 text (and the `echo` lines then break the parse).
rem ---------------------------------------------------------------------------
setlocal
set "HERE=%~dp0"
set "NODE_BIN="

where node >nul 2>nul
if not errorlevel 1 set "NODE_BIN=node"

if not defined NODE_BIN (
  for /f "delims=" %%D in ('dir /b /o-n "%USERPROFILE%\.dsh\dsh-runtimes" 2^>nul') do (
    if exist "%USERPROFILE%\.dsh\dsh-runtimes\%%D\dependencies\node\bin\node.exe" (
      set "NODE_BIN=%USERPROFILE%\.dsh\dsh-runtimes\%%D\dependencies\node\bin\node.exe"
      goto :found
    )
  )
)
:found

if not defined NODE_BIN (
  if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_BIN=%ProgramFiles%\nodejs\node.exe"
)
if not defined NODE_BIN (
  if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_BIN=%LOCALAPPDATA%\Programs\nodejs\node.exe"
)

if not defined NODE_BIN (
  echo [memory-sea] node.exe not found.
  echo   1^) Find the node.exe bundled with DSH ^(under .dsh\dsh-runtimes^)
  echo      and tell your agent the path.
  echo   2^) Or install Node.js 22.5 or newer.
  exit /b 1
)

"%NODE_BIN%" "%HERE%scripts\install.mjs" %*
exit /b %ERRORLEVEL%
