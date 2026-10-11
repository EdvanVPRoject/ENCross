@echo off
echo ========================================================
echo       Starting ENCross (P2P File & Screen Hub)
echo ========================================================
echo.
start "ENCross Server" cmd /k "cd server && npm start"
timeout /t 2 /nobreak >nul
start "ENCross Client" cmd /k "cd client && npm run dev"
echo Both Server and Client are launching!
echo Buka browser di: http://localhost:5173
echo.
