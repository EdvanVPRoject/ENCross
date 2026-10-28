@echo off
title Roblox AFK - 6x LDPlayer Launcher
cd /d "D:\LDPlayer\LDPlayer9"

echo ========================================================
echo   ROBLOX AFK MANAGER - 6 INSTANCE LDPLAYER 9
echo ========================================================
echo.
echo [1/4] Mengatur konfigurasi hemat daya (15 FPS, No Audio)...
ldconsole.exe globalsetting --fps 15 --audio 0 --cleanmode 0

echo [2/4] Menjalankan 6 Instance LDPlayer...
for %%i in (0 1 2 3 4 5) do (
    echo   - Menjalankan Instance %%i...
    ldconsole.exe launch --index %%i
    timeout /t 3 /nobreak >nul
)

echo.
echo [3/4] Menunggu instance booting dan membuka Roblox di tiap akun...
timeout /t 10 /nobreak >nul
for %%i in (0 1 2 3 4 5) do (
    ldconsole.exe runapp --index %%i --packagename com.roblox.client
)

echo.
echo [4/4] Merapikan susunan jendela (Auto-Tile Grid)...
ldconsole.exe sortWnd

echo.
echo ========================================================
echo   6 AKUN ROBLOX AFK SUDAH AKTIF!
echo   Tips: Tekan tombol Minimize atau Boss Key (Ctrl+Q)
echo   untuk minimize ke System Tray agar beban GPU 0%%.
echo ========================================================
echo.
pause
