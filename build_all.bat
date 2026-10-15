@echo off
setlocal enabledelayedexpansion
title ENCross - Master Build & Update Tool
color 0B

:: Konfigurasi Path Java untuk Android Gradle
if exist "%USERPROFILE%\.jdks\jbr-21.0.11" (
    set "JAVA_HOME=%USERPROFILE%\.jdks\jbr-21.0.11"
    set "PATH=!JAVA_HOME!\bin;!PATH!"
) else if exist "C:\Program Files\Android\Android Studio\jbr" (
    set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    set "PATH=!JAVA_HOME!\bin;!PATH!"
)

:MENU
cls
echo ===============================================================================
echo                     ENCross - Master Build & Update Tool
echo ===============================================================================
echo.
echo  Pilih opsi build atau update yang ingin Anda jalankan:
echo.
echo   [1] Build Web Client saja (Vite Production Build)
echo   [2] Build Web Client + Compile Android APK (release/ENCross.apk)
echo   [3] Build Web Client + Pack Windows Desktop (.exe Portable / Installer)
echo   [4] Build SEMUANYA (Web Client + Android APK + Desktop Windows)
echo   [5] Jalankan Lingkungan Pengembangan (Start Server + Client Browser)
echo   [6] Jalankan Aplikasi Desktop Electron (Debug Mode)
echo   [0] Keluar
echo.
echo ===============================================================================
set /p OPSI="Masukkan nomor pilihan [0-6]: "

if "%OPSI%"=="1" goto BUILD_CLIENT
if "%OPSI%"=="2" goto BUILD_ANDROID
if "%OPSI%"=="3" goto BUILD_DESKTOP
if "%OPSI%"=="4" goto BUILD_ALL
if "%OPSI%"=="5" goto RUN_DEV
if "%OPSI%"=="6" goto RUN_DESKTOP
if "%OPSI%"=="0" goto EXIT
goto MENU

:BUILD_CLIENT
cls
echo ========================================================
echo  [1/1] Membangun Web Client dengan Vite...
echo ========================================================
cd /d "%~dp0\client"
call npm.cmd run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Build Web Client gagal!
    pause
    goto MENU
)
echo.
echo [SUKSES] Web Client berhasil dibangun di client/dist!
pause
goto MENU

:BUILD_ANDROID
cls
echo ========================================================
echo  [1/3] Membangun Web Client (Vite)...
echo ========================================================
cd /d "%~dp0\client"
call npm.cmd run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Build Web Client gagal!
    pause
    goto MENU
)

echo.
echo ========================================================
echo  [2/3] Menyinkronkan Web Assets ke Android Capacitor...
echo ========================================================
call npx.cmd cap copy android
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Capacitor Copy gagal!
    pause
    goto MENU
)

echo.
echo ========================================================
echo  [3/3] Mengompilasi APK Android (Gradle Debug Build)...
echo ========================================================
cd /d "%~dp0\client\android"
call .\gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Kompilasi Gradle APK Android gagal!
    pause
    goto MENU
)

cd /d "%~dp0"
if not exist "release" mkdir release
copy /y "client\android\app\build\outputs\apk\debug\app-debug.apk" "release\ENCross.apk" >nul
copy /y "client\android\app\build\outputs\apk\debug\app-debug.apk" "client\public\ENCross.apk" >nul
copy /y "client\android\app\build\outputs\apk\debug\app-debug.apk" "client\dist\ENCross.apk" >nul

echo.
echo ========================================================
echo  [SUKSES] APK Android Terbaru Berhasil Dibuat!
echo  Lokasi File: release\ENCross.apk
echo ========================================================
pause
goto MENU

:BUILD_DESKTOP
cls
echo ========================================================
echo  [1/2] Membangun Web Client (Vite)...
echo ========================================================
cd /d "%~dp0\client"
call npm.cmd run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Build Web Client gagal!
    pause
    goto MENU
)

echo.
echo ========================================================
echo  [2/2] Memaketkan Aplikasi Windows Desktop (Electron)...
echo ========================================================
cd /d "%~dp0"
call npm.cmd run desktop:dist
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Build Desktop Electron gagal!
    pause
    goto MENU
)

echo.
echo ========================================================
echo  [SUKSES] Installer Windows Desktop Berhasil Dibuat!
echo  Lokasi File: release\
echo ========================================================
pause
goto MENU

:BUILD_ALL
cls
echo ========================================================
echo  [1/4] Membangun Web Client (Vite)...
echo ========================================================
cd /d "%~dp0\client"
call npm.cmd run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Build Web Client gagal!
    pause
    goto MENU
)

echo.
echo ========================================================
echo  [2/4] Sinkronisasi Assets ke Android Capacitor...
echo ========================================================
call npx.cmd cap copy android

echo.
echo ========================================================
echo  [3/4] Mengompilasi APK Android (Gradle)...
echo ========================================================
cd /d "%~dp0\client\android"
call .\gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Kompilasi APK Android gagal!
    pause
    goto MENU
)

cd /d "%~dp0"
if not exist "release" mkdir release
copy /y "client\android\app\build\outputs\apk\debug\app-debug.apk" "release\ENCross.apk" >nul
copy /y "client\android\app\build\outputs\apk\debug\app-debug.apk" "client\public\ENCross.apk" >nul
copy /y "client\android\app\build\outputs\apk\debug\app-debug.apk" "client\dist\ENCross.apk" >nul

echo.
echo ========================================================
echo  [4/4] Memaketkan Aplikasi Windows Desktop (Electron)...
echo ========================================================
call npm.cmd run desktop:dist

echo.
echo ========================================================
echo  [SELESAI] SEMUA FITUR TELAH DI-BUILD DENGAN SUKSES!
echo  1. APK Android: release\ENCross.apk
echo  2. Windows App: release\
echo ========================================================
pause
goto MENU

:RUN_DEV
cls
cd /d "%~dp0"
echo Memulai Server dan Client Dev...
start "ENCross Server" cmd /k "cd server && npm start"
timeout /t 2 /nobreak >nul
start "ENCross Client" cmd /k "cd client && npm run dev"
echo Aplikasi sedang berjalan di: http://localhost:5173
pause
goto MENU

:RUN_DESKTOP
cls
cd /d "%~dp0"
echo Memulai Aplikasi Desktop Electron...
call npm.cmd run desktop
goto MENU

:EXIT
exit /b 0
