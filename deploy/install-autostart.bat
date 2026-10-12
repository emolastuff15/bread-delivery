@echo off
REM ===========================================================================
REM  Register the startup tasks (Windows Server Task Scheduler)
REM
REM  RIGHT-CLICK -> "Run as administrator".  Needs admin rights.
REM
REM  Creates 4 tasks that run ONSTART as SYSTEM, so everything comes back
REM  automatically after a reboot, with no user logged in and no console window.
REM
REM  MySQL is NOT here on purpose: the MySQL MSI already registers
REM  "MySQL80" as an auto-start Windows service.
REM
REM  To remove them again:
REM     schtasks /Delete /TN "sky-backend" /F      (same for the other three)
REM ===========================================================================

net session >nul 2>&1
if errorlevel 1 (
    echo.
    echo   Please right-click this file and choose "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo Registering startup tasks...

schtasks /Create /TN "sky-redis"   /TR "C:\sky\deploy\start-redis.bat"   /SC ONSTART /RU SYSTEM /RL HIGHEST /F
schtasks /Create /TN "sky-minio"   /TR "C:\sky\deploy\start-minio.bat"   /SC ONSTART /RU SYSTEM /RL HIGHEST /F
schtasks /Create /TN "sky-backend" /TR "C:\sky\deploy\start-backend.bat" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
schtasks /Create /TN "sky-nginx"   /TR "C:\sky\deploy\start-nginx.bat"   /SC ONSTART /RU SYSTEM /RL HIGHEST /F

echo.
echo Current sky-* tasks:
schtasks /Query /FO TABLE | findstr /I "sky-"

echo.
echo Done. They will start on the next boot.
echo To start them right now WITHOUT rebooting, run:
echo    schtasks /Run /TN "sky-redis"
echo    schtasks /Run /TN "sky-minio"
echo    schtasks /Run /TN "sky-backend"
echo    schtasks /Run /TN "sky-nginx"
echo.
pause
