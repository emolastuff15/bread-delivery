@echo off
REM ===========================================================================
REM  Redis launcher (Windows Server)
REM
REM  Files:  C:\sky\middleware\redis\redis-server.exe
REM          C:\sky\middleware\redis\redis.windows.conf
REM  Logs:   C:\sky\logs\redis.log
REM
REM  Get a Windows build from https://github.com/tporadowski/redis/releases
REM  (Redis-x64-5.0.14.1.zip). Redis has no official Windows build; this port
REM  is fine for the demo (SHOP_STATUS + setmeal cache).
REM
REM  IMPORTANT: in redis.windows.conf set
REM        bind 127.0.0.1
REM  so Redis is not reachable from the internet.
REM ===========================================================================

chcp 65001 >nul
cd /d C:\sky\middleware\redis

if not exist "C:\sky\logs" mkdir "C:\sky\logs"

:loop
echo [%date% %time%] ==== starting redis ==== >> "C:\sky\logs\redis.log"
redis-server.exe redis.windows.conf >> "C:\sky\logs\redis.log" 2>&1
echo [%date% %time%] ==== redis exited (code %ERRORLEVEL%), restart in 5s ==== >> "C:\sky\logs\redis.log"
timeout /t 5 /nobreak >nul
goto loop
