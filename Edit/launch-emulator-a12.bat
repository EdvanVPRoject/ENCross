@echo off
title Android 12 AFK Clean (QEMU Core)
echo ========================================================
echo   MENJALANKAN ANDROID 12 CLEAN (API 31 - NATIVE ARM TRANSLATION)
echo ========================================================
echo OS Version : Android 12 (API 31)
echo GPU Backend: Hardware Host (NVIDIA)
echo Resolusi   : 540p (540x960 Native AFK)
echo RAM Alokasi: 2 GB
echo Audio      : Dinonaktifkan (Hemat CPU)
echo Launcher   : Stock Launcher
echo ========================================================
echo.

set EMULATOR_EXE="C:\Users\edvan\AppData\Local\Android\Sdk\emulator\emulator.exe"
%EMULATOR_EXE% -avd Android12_AFK_Clean -writable-system -no-snapshot-load -gpu host -no-audio -no-boot-anim -memory 2048 -cores 2 -crash-report-mode disabled
pause
