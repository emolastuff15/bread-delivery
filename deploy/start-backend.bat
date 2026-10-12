@echo off
REM ===========================================================================
REM  sky-take-out backend launcher  (Windows Server)
REM
REM  WHY THIS FILE IS ENGLISH-ONLY:
REM    cmd.exe reads a .bat file using the OEM codepage (936 on Chinese Windows).
REM    Chinese characters saved as UTF-8 here would show up as garbage.
REM    Chinese documentation lives in deploy\README.md instead.
REM
REM  What it does:
REM    1. chcp 65001        -> console uses UTF-8, so the Java logs show Chinese
REM                            correctly (needs -Dfile.encoding=UTF-8 below)
REM    2. cd /d C:\sky      -> IMPORTANT: Spring Boot looks for .\config\ in the
REM                            WORKING DIRECTORY, so application-prod.yml is
REM                            found only if we are inside C:\sky
REM    3. loop forever      -> if the backend crashes it restarts after 5s
REM    All output is appended to C:\sky\logs\backend.log
REM ===========================================================================

chcp 65001 >nul
cd /d C:\sky

if not exist "C:\sky\logs" mkdir "C:\sky\logs"

REM MySQL / Redis / MinIO start at the same time as this task after a reboot.
REM Wait a bit so the backend does not crash on a not-yet-ready database.
timeout /t 15 /nobreak >nul

:loop
echo [%date% %time%] ==== starting backend ==== >> "C:\sky\logs\backend.log"
java -Xms256m -Xmx512m -Duser.timezone=Asia/Shanghai -Dfile.encoding=UTF-8 -jar "C:\sky\app.jar" --spring.profiles.active=prod >> "C:\sky\logs\backend.log" 2>&1
echo [%date% %time%] ==== backend exited (code %ERRORLEVEL%), restart in 5s ==== >> "C:\sky\logs\backend.log"
timeout /t 5 /nobreak >nul
goto loop
