@echo off
REM ===========================================================================
REM  MinIO launcher (Windows Server)  --  single exe, no Docker needed
REM
REM  Files:  C:\sky\middleware\minio\minio.exe
REM  Data:   C:\sky\data\minio          <- uploaded images live here forever
REM  Logs:   C:\sky\logs\minio.log
REM
REM  --address 127.0.0.1:9000         -> only reachable from this machine.
REM                                      nginx proxies /img/ to it, so the
REM                                      internet never sees port 9000.
REM  --console-address 127.0.0.1:9001 -> web console; open it from the RDP
REM                                      session at http://localhost:9001
REM
REM  Credentials are set below; they must match sky.minio.access-key /
REM  secret-key in C:\sky\config\application-prod.yml
REM ===========================================================================

chcp 65001 >nul
cd /d C:\sky\middleware\minio

if not exist "C:\sky\logs" mkdir "C:\sky\logs"
if not exist "C:\sky\data\minio" mkdir "C:\sky\data\minio"

set MINIO_ROOT_USER=minioadmin
set MINIO_ROOT_PASSWORD=minioadmin

:loop
echo [%date% %time%] ==== starting minio ==== >> "C:\sky\logs\minio.log"
minio.exe server C:\sky\data\minio --address 127.0.0.1:9000 --console-address 127.0.0.1:9001 >> "C:\sky\logs\minio.log" 2>&1
echo [%date% %time%] ==== minio exited (code %ERRORLEVEL%), restart in 5s ==== >> "C:\sky\logs\minio.log"
timeout /t 5 /nobreak >nul
goto loop
