@echo off
chcp 65001 >nul
title WorldForge: Nations - Launcher
cd /d "%~dp0"

echo ============================================================
echo    WORLDForge: NATIONS - LAUNCHER
echo ============================================================
echo.

rem ── 1. Sprawdz czy Node.js jest zainstalowany ──────────────────
where node >nul 2>nul
if errorlevel 1 (
    echo [BLAD] Brak Node.js na tym komputerze!
    echo.
    echo Pobierz i zainstaluj z:  https://nodejs.org  ^(wersja LTS^)
    echo Potem uruchom ten plik ponownie.
    echo.
    pause
    exit /b 1
)

rem ── 2. Pierwsze uruchomienie: instalacja zaleznosci ────────────
if not exist "node_modules\ws" (
    echo Pierwsze uruchomienie - instaluje zaleznosci ^~30 sekund^)...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [BLAD] Nie udalo sie zainstalowac zaleznosci. Sprawdz internet.
        pause
        exit /b 1
    )
)

rem ── 3. Czy serwer juz dziala? ───────────────────────────────────
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo Serwer juz dziala - otwieram gre.
    goto :otworz
)

rem ── 4. Start serwera w osobnym oknie ────────────────────────────
echo Startuje serwer gry...
start "WORLDFORGE-SERWER" cmd /k "node server.js"
echo Czekam na start serwera...
timeout /t 4 /nobreak >nul

:otworz
rem ── 5. Otworz gre w oknie bez paska przegladarki ^tryb app^) ────
set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if defined BROWSER (
    start "" "%BROWSER%" --app=http://localhost:8080
) else (
    start "" http://localhost:8080
)

echo.
echo ============================================================
echo  GRA OTWARTA w osobnym oknie ^- pelny ekran dla mapy^)
echo  Fullscreen w oknie gry: klawisz F11
echo.
echo  Serwer dziala w oknie "WORLDFORGE-SERWER" - mozesz je
echo  zminimalizowac ^nie zamykac^). Zamkniecie okna = stop serwera.
echo.
echo  MULTIPLAYER: w grze wybierz "Tryb Wieloosobowy" i daj kolegom
echo  kod pokoju ^WF-XXXX^). Gra przez internet: w oknie serwera
echo  uruchom:  npx cloudflared tunnel --url http://localhost:8080
echo  i przekaz kolegom wygenerowany link https://...
echo.
echo  Zatrzymanie serwera: ZATRZYMAJ-SERWER.bat
echo ============================================================
echo.
echo To okno mozna zamknac - serwer dziala dalej.
timeout /t 10 >nul
