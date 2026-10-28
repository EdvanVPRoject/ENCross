@echo off
title Stop All LDPlayer Instances
cd /d "D:\LDPlayer\LDPlayer9"

echo ========================================================
echo   MENGHENTIKAN SEMUA INSTANCE LDPLAYER 9...
echo ========================================================
echo.
ldconsole.exe quitall
echo Selesai! Semua instance telah dimatikan.
timeout /t 3
