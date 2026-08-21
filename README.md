# 🌍 WorldForge: Nations — Global State Simulator

Zaawansowany symulator państwa: ekonomia, budżet, podatki, bank centralny, handel
zagraniczny, dyplomacja, wojsko, badania, projekty strategiczne i wieloosobowa
rozgrywka przez WebSocket. 184 państwa świata, dane bazowe 2025/2026.

## 🚀 Szybki start

### Wymagania
- Node.js **18+**
- Przeglądarka desktopowa (Chrome / Edge / Firefox)

### Uruchomienie — NAJSZYBCIEJ (Windows)

**Podwójny klik: `URUCHOM-GRE.bat`** — sam instaluje zależności (za pierwszym
razem), startuje serwer i otwiera grę w osobnym oknie bez paska przeglądarki
(pełny ekran dla mapy, dodatkowo F11). Wariant bez żadnej konsoli:
`URUCHOM-BEZ-KONSOLI.vbs`. Zatrzymanie: `ZATRZYMAJ-SERWER.bat`.
Szczegóły: `JAK-URUCHOMIC.txt`.

**Gra z kolegą przez internet: `GRA-Z-KOLEGA.bat`** — startuje serwer *i tunel
Cloudflare*, po chwili **sam wyświetla i kopiuje do schowka publiczny link**
(zapisany też w `LINK-DO-GRY.txt`) — wklejasz go koledze, on dołącza kodem
pokoju `WF-XXXX`. Zero konfiguracji.

### Ręcznie (wszystkie systemy)

```bash
npm install
npm start
```

Serwer automatycznie wybiera pierwszy wolny port z listy **8080, 3000, 8000, 5000, 8888**
i wypisuje w konsoli adres, np. `http://localhost:8080`. Otwórz go w przeglądarce.

> Grę w trybie single player można też otworzyć bezpośrednio przez `index.html`
> (podwójne kliknięcie) — serwer jest wymagany tylko do trybu wieloosobowego.

### Tryb wieloosobowy

1. Host: `npm start`, a następnie w grze → *Tryb Wieloosobowy* → **Utwórz pokój**.
2. Zanotuj kod pokoju w formacie `WF-XXXX`.
3. Znajomi wchodzą przez *Dołącz do pokoju* — kod można wpisywać w dowolnym
   formacie (`WF-AB12`, `ab12`, `  wf - ab12 `).
4. Grę w sieci LAN udostępnisz przez tunel: `npx cloudflared tunnel --url http://localhost:8080`.

## 🧪 Testy

```bash
npm test        # testy integracyjne serwera multiplayer (9 scenariuszy)
npm run test:ui # testy dymne interfejsu (jsdom: start gry, zakładki, komendy)
```

Testy wbudowane w grę: otwórz `http://localhost:8080/?test=1` — panel diagnostyczny
pokaże wyniki 14 self-testów (baza państw, formaty PL, walidatory, zapis/wczytanie).

## 🎮 Sterowanie

| Skrót / przycisk | Akcja |
|---|---|
| `Spacja` | pauza / wznowienie symulacji |
| `Enter` | natychmiastowe zakończenie miesiąca |
| `1`–`9` | przełączanie zakładek analitycznych |
| ⏸ / ×1 / ×2 / ×4 | prędkość upływu miesiąca |

## 🗂️ Struktura projektu

```
├── index.html          # powłoka aplikacji (terminal strategiczny)
├── server.js           # serwer HTTP + WebSocket (multiplayer, pokoje, sesje)
├── css/                # stylesheety (zmienne motywu, layout, komponenty, mapa, responsywność)
├── vendor/             # lokalne biblioteki (d3.min.js — offline, bez CDN)
├── js/
│   ├── core/           # namespace, stan gry, silnik tur, komendy, zapisy, walidatory
│   ├── data/           # dane: 184 państwa, geografia Natural Earth, surowce, technologie...
│   ├── systems/        # silniki symulacji (ekonomia, budżet, handel, bankowość, wojsko...)
│   └── ui/             # widoki interfejsu (mapa świata, giełda, budżet, dyplomacja...)
└── tests/              # self-testy przeglądarkowe + testy integracyjne Node
```

## ⚖️ Model ekonomiczny (skrót)

- Miesięczna tura symulacji, realne jednostki (USD, tony, GWh).
- Budżet: dochody podatkowe ~33% PKB vs wydatki bazowe ~33% PKB + obsługa długu.
- Giełda surowcowa: zlecenia wykonują się po cenie rynkowej z realnym wpływem
  wolumenu na cenę (market impact) — próba dumpingu ogromnych zapasów obniża cenę.
- Umowy bilateralne: AI akceptuje ceny tylko w paśmie ~85–115% ceny spot i tylko
  wtedy, gdy jest wypłacalne.
- Inflacja: każde państwo ma własną kotwicę inflacyjną (kraje niestabilne nie
  zbiegają do 2% jak Szwajcaria) + presja fiskalna przy deficytach > 4% PKB.

## 🔧 Stack

- Frontend: czysty JavaScript (bez frameworków), D3.js (lokalnie), CSS custom properties.
- Backend: Node.js + `ws` (WebSocket), sessions, heartbeat, 60s okres ochronny reconnect.

## 📄 Licencja

MIT
