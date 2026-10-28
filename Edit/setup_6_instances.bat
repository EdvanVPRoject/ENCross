@echo off
title LDPlayer 9 - 6x Instance Setup
cd /d "D:\LDPlayer\LDPlayer9"

echo ========================================================
echo   SETUP 6 AKUN LDPLAYER 9 DENGAN DELTA LITE ROBLOX
echo ========================================================
echo.
echo [1/3] Memastikan profil hemat daya di Instance 0...
ldconsole.exe modify --index 0 --resolution 480,320,120 --cpu 1 --memory 1536

echo [2/3] Memasang Delta Lite Roblox di Instance Master...
if exist "C:\Users\edvan\Downloads\Delta-Lite-1.apk" (
    ldconsole.exe installapp --index 0 --filename "C:\Users\edvan\Downloads\Delta-Lite-1.apk"
)

echo [3/3] Melakukan Clone ke 5 Akun Berikutnya...
for %%i in (1 2 3 4 5) do (
    echo   - Meng-clone Roblox-%%i...
    ldconsole.exe copy --name "Roblox-%%i" --from 0
    ldconsole.exe modify --index %%i --resolution 480,320,120 --cpu 1 --memory 1536
)

echo.
echo ========================================================
echo   SETUP SELESAI! SEMUA 6 AKUN SIAP DIGUNAKAN.
echo ========================================================
echo.
pause
