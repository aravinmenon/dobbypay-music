@echo off
set ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe

echo [1/4] Connecting to emulator...
%ADB% wait-for-device

echo [2/4] Waiting for Android OS boot to complete...
:loop
for /f %%i in ('%ADB% shell getprop sys.boot_completed 2^>nul') do set BOOT=%%i
if "%BOOT%"=="1" goto ready
timeout /t 3 /nobreak >nul
goto loop

:ready
echo [3/4] Emulator OS is ready! Installing app-debug.apk...
%ADB% install -r app-debug.apk

echo [4/4] Launching DobbyPay Music App...
%ADB% shell monkey -p com.dobbypay.music -c android.intent.category.LAUNCHER 1

echo.
echo Verification: Checking if app process is running...
%ADB% shell "pidof com.dobbypay.music || ps -A | grep com.dobbypay.music"

echo ALL DONE!
