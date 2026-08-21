@echo off
chcp 65001 >nul
title WorldForge - Zatrzymanie serwera
echo Zatrzymuje serwer WorldForge (porty 8080 / 3000)...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Gotowe. Serwer zatrzymany.
timeout /t 3 >nul
