@echo off
setlocal
pushd "%~dp0"
set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  echo Node runtime not found.
  pause
  exit /b 1
)
start "rss" /min "%NODE_EXE%" "%CD%\server\rss-server.js"
start "app" /min "%NODE_EXE%" "%CD%\node_modules\vite\bin\vite.js" --host 127.0.0.1 --port 5173
ping 127.0.0.1 -n 4 >nul
start "" "http://127.0.0.1:5173/?brand=public"
popd
endlocal
