@echo off
title Buka Roblox 6 Akun AFK (Grid 2x3 - Android 12)
echo ========================================================
echo   MEMBUKA 6 AKUN ROBLOX DELTA LITE (GRID AFK 2x3)
echo ========================================================

set ADB="C:\Users\edvan\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set DEVICE=emulator-5554

echo [*] Memeriksa status emulator (%DEVICE%)...
%ADB% -s %DEVICE% wait-for-device
%ADB% -s %DEVICE% root
%ADB% -s %DEVICE% wait-for-device

echo [*] Mengoptimalkan pengaturan sistem Android untuk AFK...
%ADB% -s %DEVICE% shell "setenforce 0"
%ADB% -s %DEVICE% shell /system/bin/setup_zram.sh
%ADB% -s %DEVICE% shell settings put global enable_freeform_support 1
%ADB% -s %DEVICE% shell settings put global force_resizable_activities 1
%ADB% -s %DEVICE% shell setprop persist.sys.multi_resume 1

REM Optimasi hemat CPU & baterai (Zero Animation, Always On)
%ADB% -s %DEVICE% shell settings put global window_animation_scale 0.0
%ADB% -s %DEVICE% shell settings put global transition_animation_scale 0.0
%ADB% -s %DEVICE% shell settings put global animator_duration_scale 0.0
%ADB% -s %DEVICE% shell settings put secure location_mode 0
%ADB% -s %DEVICE% shell svc power stayon true

echo [*] Memberikan izin penyimpanan dan overlay untuk ke-6 Clone...
for %%P in (com.roblox.client com.roblox.clienu com.roblox.clienv com.roblox.clienw com.roblox.clienx com.roblox.clieny) do (
    %ADB% -s %DEVICE% shell appops set %%P MANAGE_EXTERNAL_STORAGE allow 2>nul
    %ADB% -s %DEVICE% shell appops set %%P SYSTEM_ALERT_WINDOW allow 2>nul
    %ADB% -s %DEVICE% shell pm grant %%P android.permission.READ_EXTERNAL_STORAGE 2>nul
    %ADB% -s %DEVICE% shell pm grant %%P android.permission.WRITE_EXTERNAL_STORAGE 2>nul
)

echo [*] Membuka Clone 01 (com.roblox.client)...
%ADB% -s %DEVICE% shell am start -f 0x10000000 --windowingMode 5 -n com.roblox.client/.startup.LauncherAliasMain
ping -n 7 127.0.0.1 >nul

echo [*] Membuka Clone 02 (com.roblox.clienu)...
%ADB% -s %DEVICE% shell am start -f 0x10000000 --windowingMode 5 -n com.roblox.clienu/com.roblox.client.startup.LauncherAliasMain
ping -n 7 127.0.0.1 >nul

echo [*] Membuka Clone 03 (com.roblox.clienv)...
%ADB% -s %DEVICE% shell am start -f 0x10000000 --windowingMode 5 -n com.roblox.clienv/com.roblox.client.startup.LauncherAliasMain
ping -n 7 127.0.0.1 >nul

echo [*] Membuka Clone 04 (com.roblox.clienw)...
%ADB% -s %DEVICE% shell am start -f 0x10000000 --windowingMode 5 -n com.roblox.clienw/com.roblox.client.startup.LauncherAliasMain
ping -n 7 127.0.0.1 >nul

echo [*] Membuka Clone 05 (com.roblox.clienx)...
%ADB% -s %DEVICE% shell am start -f 0x10000000 --windowingMode 5 -n com.roblox.clienx/com.roblox.client.startup.LauncherAliasMain
ping -n 7 127.0.0.1 >nul

echo [*] Membuka Clone 06 (com.roblox.clieny)...
%ADB% -s %DEVICE% shell am start -f 0x10000000 --windowingMode 5 -n com.roblox.clieny/com.roblox.client.startup.LauncherAliasMain
ping -n 7 127.0.0.1 >nul

echo [*] Menata ke-6 jendela ke Grid 2 Kolom x 3 Baris...
ping -n 4 127.0.0.1 >nul
%ADB% -s %DEVICE% shell /system/bin/grid_roblox.sh

echo.
echo ========================================================
echo   [V] SEMUA 6 AKUN ROBLOX BERHASIL DIBUKA ^& DITATA!
echo ========================================================
ping -n 3 127.0.0.1 >nul
