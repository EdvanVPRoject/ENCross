@echo off
echo ========================================================
echo       Starting VanCross (P2P File & Screen Hub)
echo ========================================================
echo.
start "VanCross Server" cmd /k "cd server && npm start"
timeout /t 2 /nobreak >nul
start "VanCross Client" cmd /k "cd client && npm run dev"
echo Both Server and Client are launching!
echo Buka browser di: http://localhost:5173
echo.
