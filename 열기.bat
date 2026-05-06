@echo off
setlocal
cd /d "%~dp0"
set "NODE_EXE=C:\Users\코리아타비\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  echo Node.js runtime not found.
  pause
  exit /b 1
)
start "" "%NODE_EXE%" "%~dp0node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5173
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5173"
endlocal
