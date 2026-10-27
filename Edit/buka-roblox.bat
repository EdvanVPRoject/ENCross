@echo off
title Buka Roblox Floating Mode (Dual Clone AFK - Android 12)
echo ========================================================
echo   MEMBUKA ROBLOX DUAL CLONE DALAM MODE FLOATING WINDOW
echo ========================================================

set ADB="C:\Users\edvan\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set DEVICE=emulator-5554

echo [*] Memeriksa status emulator (%DEVICE%)...
%ADB% -s %DEVICE% wait-for-device
%ADB% -s %DEVICE% root
%ADB% -s %DEVICE% wait-for-device

echo [*] Memastikan SELinux Permissive, ZRAM 3GB, ^& Freeform Support aktif...
%ADB% -s %DEVICE% shell "setenforce 0"
%ADB% -s %DEVICE% shell /system/bin/setup_zram.sh
%ADB% -s %DEVICE% shell settings put global enable_freeform_support 1
%ADB% -s %DEVICE% shell settings put global force_resizable_activities 1

echo [*] Memberikan izin penyimpanan dan overlay untuk Clone 01 ^& 02...
for %%P in (com.roblox.client com.roblox.clienu) do (
    %ADB% -s %DEVICE% shell appops set %%P MANAGE_EXTERNAL_STORAGE allow 2>nul
    %ADB% -s %DEVICE% shell appops set %%P SYSTEM_ALERT_WINDOW allow 2>nul
    %ADB% -s %DEVICE% shell pm grant %%P android.permission.READ_EXTERNAL_STORAGE 2>nul
    %ADB% -s %DEVICE% shell pm grant %%P android.permission.WRITE_EXTERNAL_STORAGE 2>nul
)

echo [*] Membuka ROBLOX DELTA LITE 01 (com.roblox.client) ke Floating Window...
%ADB% -s %DEVICE% shell am start -f 0x10000000 --windowingMode 5 -n com.roblox.client/.startup.LauncherAliasMain

echo [*] Menunggu inisialisasi clone 1 selesai (7 detik)...
ping -n 8 127.0.0.1 >nul

echo [*] Membuka ROBLOX DELTA LITE 02 (com.roblox.clienu) ke Floating Window...
%ADB% -s %DEVICE% shell am start -f 0x10000000 --windowingMode 5 -n com.roblox.clienu/com.roblox.client.startup.LauncherAliasMain

echo [*] Menyesuaikan tata letak Split Screen (Atas / Bawah)...
ping -n 4 127.0.0.1 >nul
%ADB% -s %DEVICE% shell /system/bin/split_roblox.sh

echo.
echo ========================================================
echo   [V] KEDUA ROBLOX SPLIT SCREEN BERHASIL DITATA!
echo ========================================================
ping -n 3 127.0.0.1 >nul
