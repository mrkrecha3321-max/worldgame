#!/usr/bin/env bash
# WorldForge: Nations — launcher (Linux/macOS)
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[BŁĄD] Brak Node.js — zainstaluj z https://nodejs.org"
  exit 1
fi

if [ ! -d "node_modules/ws" ]; then
  echo "Pierwsze uruchomienie — instalacja zależności..."
  npm install --no-audit --no-fund || exit 1
fi

# Serwer w tle
node server.js &
SERVER_PID=$!
echo "Serwer PID: $SERVER_PID — zatrzymanie: ./ZATRZYMAJ? kill $SERVER_PID"
sleep 3

# Otwórz domyślną przeglądarkę
(xdg-open http://localhost:8080 2>/dev/null || open http://localhost:8080 2>/dev/null) &
echo "Gra: http://localhost:8080  (Ctrl+C tutaj zatrzymuje serwer)"
wait $SERVER_PID
