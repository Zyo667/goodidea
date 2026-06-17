@echo off
chcp 936 > nul
echo ==========
echo   nailong Gallery - Local Server
echo ==========

cd /d "%~dp0"

echo.
echo [1/3] Scanning images, updating manifest...
python generate_manifest.py
if errorlevel 1 (
    echo Warning: Python script failed, using existing manifest.js
)

echo.
echo [2/3] Starting server on port 8000...
start "nailong-server" /min cmd /k "python server.py"

echo.
echo [3/3] Waiting for server to start...
timeout /t 2 > nul

echo.
echo Opening gallery in browser...
start "" "http://localhost:8000"

echo.
echo Gallery opened! Server is running in background.
echo To stop server, close the "nailong-server" window.
echo.
pause
