@echo off
chcp 65001 >nul
title WorldForge - Gra z kolega (serwer + tunel + link)
cd /d "%~dp0"

echo ============================================================
echo    WORLDForge: NATIONS - GRA Z KOLEGA
echo    (serwer + publiczny link, wszystko automatycznie)
echo ============================================================
echo.

rem ── 1. Node.js ──────────────────────────────────────────────────
where node >nul 2>nul
if errorlevel 1 (
    echo [BLAD] Brak Node.js! Zainstaluj z https://nodejs.org ^(LTS^)
    pause
    exit /b 1
)

rem ── 2. Zaleznosci gry (pierwszy raz) ────────────────────────────
if not exist "node_modules\ws" (
    echo Pierwsze uruchomienie: instaluje zaleznosci gry...
    call npm install --no-audit --no-fund
    if errorlevel 1 ( echo [BLAD] Instalacja zaleznosci nieudana. & pause & exit /b 1 )
)

rem ── 3. Serwer gry (gdy jeszcze nie dziala) ──────────────────────
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>nul
if errorlevel 1 (
    echo Startuje serwer gry...
    start "WORLDFORGE-SERWER" cmd /k "node server.js"
    timeout /t 4 /nobreak >nul
) else (
    echo Serwer gry juz dziala.
)

rem ── 4. Tunel Cloudflare (gdy jeszcze nie dziala) ────────────────
tasklist 2>nul | findstr /i "cloudflared" >nul
if not errorlevel 1 (
    echo Tunel juz dziala - odczytuje zapisany link.
    if exist "LINK-DO-GRY.txt" (
        for /f "usebackq delims=" %%a in ("LINK-DO-GRY.txt") do set "LINK=%%a"
    )
    goto :pokaz_link
)

echo Startuje tunel Cloudflare...
if not exist "tunnel.log" type nul > "tunnel.log"
start "WORLDFORGE-TUNEL" cmd /c "npx -y cloudflared tunnel --url http://localhost:8080 > tunnel.log 2>&1"

echo    Pierwszy raz: pobieranie cloudflared moze potrwac do ~1 min.
set /a PROBA=0
:czekaj_na_link
timeout /t 3 /nobreak >nul
set /a PROBA+=1
powershell -NoProfile -Command "$m = Select-String -Path 'tunnel.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1; if ($m) { [Console]::Out.Write($m.Matches[0].Value) }" > "%TEMP%\wf_link.tmp" 2>nul
set /p LINK=<"%TEMP%\wf_link.tmp"
del "%TEMP%\wf_link.tmp" >nul 2>nul
if "%LINK%"=="" (
    if %PROBA% LSS 30 goto :czekaj_na_link
    echo.
    echo [BLAD] Nie udalo sie uzyskac linku w 90 sekund.
    echo Sprawdz okno WORLDFORGE-TUNEL i internet, sprobuj ponownie.
    pause
    exit /b 1
)

:pokaz_link
if "%LINK%"=="" (
    echo [BLAD] Brak linku w LINK-DO-GRY.txt - uruchom ponownie.
    pause
    exit /b 1
)

rem ── 5. Zapisz link + skopiuj do schowka ─────────────────────────
> "LINK-DO-GRY.txt" echo %LINK%
echo %LINK%| clip

rem ── 6. Otworz gre w oknie aplikacji ─────────────────────────────
set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if defined BROWSER ( start "" "%BROWSER%" --app=http://localhost:8080 ) else ( start "" http://localhost:8080 )

rem ── 7. Podsumowanie ─────────────────────────────────────────────
color 0A
cls
echo ============================================================
echo.
echo      LINK DO GRY DLA KOLEGI ^juz w schowku - tylko Ctrl+V^):
echo.
echo          %LINK%
echo.
echo      ^zapisany tez w pliku LINK-DO-GRY.txt^)
echo.
echo  Co dalej:
echo   1. Wklej link koledze ^komunikator^).
echo   2. Kolega otwiera link w przegladarce.
echo   3. Ty: Tryb Wieloosobowy - Utworz pokoj - kod WF-XXXX.
echo   4. Kolega: Dołącz do pokoju - wpisuje kod.
echo.
echo  Serwer: okno WORLDFORGE-SERWER. Tunel: WORLDFORGE-TUNEL.
echo  Koniec grania: zamknij oba okna LUB uruchom ZATRZYMAJ-SERWER.bat
echo.
echo ============================================================
pause
color 07
