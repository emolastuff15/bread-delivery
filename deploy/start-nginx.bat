@echo off
REM ===========================================================================
REM  nginx launcher (Windows Server)
REM
REM  Files:  C:\sky\middleware\nginx\nginx.exe   (nginx for Windows, zip build)
REM  Conf:   C:\sky\middleware\nginx\conf\nginx.conf
REM
REM  Checks the config first; if it is broken nothing starts (so a typo does not
REM  silently kill your web site after a reboot).
REM
REM  Manual control (from C:\sky\middleware\nginx):
REM     nginx -t            test config
REM     start nginx         start
REM     nginx -s reload     reload after editing config
REM     nginx -s stop       stop
REM ===========================================================================

chcp 65001 >nul
cd /d C:\sky\middleware\nginx

if not exist "C:\sky\logs" mkdir "C:\sky\logs"

REM nginx refuses to start with "[emerg] open() logs/xxx.log failed" when its own
REM logs directory is missing (it ships with the zip, but do not rely on that).
if not exist "C:\sky\middleware\nginx\logs" mkdir "C:\sky\middleware\nginx\logs"
if not exist "C:\sky\middleware\nginx\temp" mkdir "C:\sky\middleware\nginx\temp"

nginx.exe -t >> "C:\sky\logs\nginx-start.log" 2>&1
if errorlevel 1 (
    echo [%date% %time%] nginx config test FAILED, not starting >> "C:\sky\logs\nginx-start.log"
    exit /b 1
)

echo [%date% %time%] nginx config ok, starting >> "C:\sky\logs\nginx-start.log"
start "" nginx.exe
