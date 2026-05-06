@echo off
setlocal
pushd "%~dp0"
set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  echo Node runtime not found.
  pause
  exit /b 1
)
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "$ip=(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress); if ($ip) { $ip } else { '127.0.0.1' }"`) do set "LOCAL_IP=%%i"
echo.
echo PC URL:
echo   http://127.0.0.1:5173/?brand=personal
echo.
echo Phone URL:
echo   http://%LOCAL_IP%:5173/?brand=personal
echo.
echo Keep this window open. Allow Windows Firewall if asked.
echo.
start "rss" /min "%NODE_EXE%" "%CD%\server\rss-server.js"
start "" "http://127.0.0.1:5173/?brand=personal"
"%NODE_EXE%" "%CD%\node_modules\vite\bin\vite.js" --host 0.0.0.0 --port 5173
popd
pause
endlocal
