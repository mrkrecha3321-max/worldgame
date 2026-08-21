# 📋 PLAN: Pełna symulacja giełdy złota + kopalnie (wersja do zatwierdzenia)

> Dane oparte na realnych liczbach z sierpnia 2026. Nic nie koduję dopóki nie napiszesz "gotowe".
> Przy każdej decyzji podaję: co robię, jaka liczba, skąd się wzięła.

---

## 📊 Dane wejściowe — REALNE (stan: sierpień 2026)

### Ceny rynkowe (spot, 20.08.2026)
| Aktywo | Cena teraz | Rok temu | Źródło |
|---|---|---|---|
| **Złoto** | **$4,523/oz** (52tys. max: $5,478) | $3,315 | USA Today / Fortune |
| Srebro | $67/oz | ~$30 | Fortune |
| Platyna | $1,809/oz | — | Fortune |

**Przelicznik:** 1 tona = 32,151 oz → **1 t złota ≈ $145 mln** w cenach bieżących.

### Rezerwy złota banków centralnych (2026, tony)
| Kraj | Tony | Kraj | Tony |
|---|---|---|---|
| USA | 8,133 | Holandia | 612 |
| Niemcy | 3,350 | **Polska** | **~570** (cel NBP: 700!) |
| Włochy | 2,452 | Turcja | ~570 |
| Francja | 2,437 | Tajwan | 424 |
| Rosja | ~2,310 | Uzbekistan | ~400 |
| Chiny | ~2,310 | Kazachstan | 354 |
| Szwajcaria | 1,040 | Arabia Saud. | 323 |
| Indie | 880 | UK | 310 |
| Japonia | 846 | Hiszpania | 282 |

- Świat CB łącznie: **>36,000 t** (≈ $5,2 bln)
- Trend 2026: banki centralne **skupują** (863 t w 2025, +244 t w Q1 2026) — Polska, Chiny, Turcja, Indie najagresywniej; Rosja od 11.2025 **sprzedaje**

### Produkcja świata
- Rekord 2025: **3,672 t/rok** (≈306 t/miesiąc); Chiny 380 t, Rosja 330 t, Australia 284 t
- Największe kopalnie: Nevada Gold Mines **~93 t/rok**, Muruntau (Uzbekistan) ~50-55 t, Pueblo Viejo ~30 t, Grasberg ~22 t (po awarii)
- Całe złoto kiedykolwiek wydobyte: ~218,000 t

---

## 🏗️ MODUŁ 1: Kopalnie złota (rozszerzenie systemu fabryk)

### 3 typy kopalń (nowe wpisy w `factories.js`)
| Typ | Koszt budowy | Wydobycie START | Czas budowy | Koszt oper. (AISC) |
|---|---|---|---|---|
| 🪙 Średnia kopalnia (open-pit) | **8 mld $** | **20 t/rok** | 10 m-cy | $1,900/oz |
| ⛏️ Duża kopalnia (Muruntau-scale) | **25 mld $** | **50 t/rok** | 16 m-cy | $1,750/oz |
| 🏔️ Mega-dystrykt (Nevada-scale) | **50 mld $** ← najdroższa, jak chciałeś | **100 t/rok** | 24 m-cy | $1,600/oz |

### Ulepszenia — dokładnie Twój pomysł
- Modernizacja: koszt ×1.5/poziom (jak fabryki), **limit 5 pozycji**
- Wydobycie ×1.5 na poziom → mega-dystrykt:
  - L1: 100 t/rok → L2: 150 → L3: 225 → L4: 338 → **L5: ~506 t/rok (Twoje "max 500 t")**
- **Możesz budować ile chcesz** (20 kopalń w Polsce? proszę bardzo) — ogranicza Cię tylko kasa i… rynek (Module 2 ukarze masowe wydobycie spadkiem ceny, bo przecież zalewasz świat podażą)

### Ekonomia kopalni
- Produkcja miesięczna = roczna/12, w uncjach, **prosto do rezerw państwa** (skarbiec złota)
- **AISC (all-in sustaining cost)**: kopalnia ZARABIA (cena − AISC) × wydobycie; gdy cena złota spadnie poniżej AISC → kopalnia generuje stratę miesięczną (przycisk "Wstrzymaj wydobycie")
- Zwrot inwestycji przy cenie $4,500: mega (100t/rok) → marża $2,600/oz × 3.2M oz = ~$8.4 mld/rok → **zwrot ~6 lat** (realistycznie dla górnictwa)
- Boty-górnicy budują wg realnych specjalizacji (RPA, Australia, Kanada, Ghana, Uzbekistan, China, Rosja...)

## 📈 MODUŁ 2: Prawdziwa głębokość rynku i krachy

### Głębokość rynku (market depth) per aktywo
- Każdy aktywum dostaje parametr `marketDepth` (np. złoto: **~150 t/mies.** bezbolesnej absorpcji — wynika z realnych obrotów CB 72 t/mies + inwestycyjnych)
- **Nieliniowy impact**: sprzedaż do 150 t → ≤2% wpływu; 500 t → ~-12%; **1000 t → ~-30…-40% natychmiast** (Twoje 1000 t = krach)
- Zlecenie powyżej 40% głębokości miesięcznej → **odrzucenie**: "rynek nie wchłonie tego wolumenu — sprzedawaj partiami albo w kontraktach"

### Kontagion (krach się rozlewa — jak chciałeś)
Zrzut złota wywołuje łańcuch (współczynnik korelacji):
- Srebro: **-0.8 ×** spadek złota
- Platyna/pallad: -0.5×
- Akcje (zwłaszcza górnicze): **-0.4×** (risk-off, marginesy)
- Pozostałe surowce: -0.15×
- Dolar/USD: umocnienie +0.1× (safe haven) → eksport gracza droższy
- Symetrycznie: skup złota podbija skorelowane aktywa

### Trwałość szoku
- Po krachu cena wraca regresją do wartości fundamentalnej, ale **fundamentalna obniża się trwale** o część nadpodaży (świat ma więcej złota = mniej warte) — masowe kopalnie obniżają cenę strukturalnie (wbrew sobie)

## 🏦 MODUŁ 3: Realne rezerwy startowe + polityka CB botów

- Każde państwo startuje z **realnym zapasem** z tabeli powyżej (USA 8,133 t = 261M oz; Polska 570 t = 18.3M oz; reszta świata wg danych/heurystyki — razem ~36,000 t)
- **Boty-CB grają jak prawdziwe**: Polskagne do celu 700 t (skupuje ~10 t/mies. gdy poniżej), Chiny +7 t/mies., Rosja sprzedaje 15 t/mies., Niemcy stabilne
- Ich zakupy/sprzedaże **realnie ruszają ceną** (wchodzą w market depth)

## ⚠️ MODUŁ 4: Ostrzeżenia i konsekwencje wyprzedaży rezerw

### Przed sprzedażą (modal potwierdzenia)
- Sprzedaż >5% rezerw → żółty warning: "Sprzedajesz X t (Y% rezerw narodowych). Rezerwy podpierają złotowego/podpierają walutę…"
- Podgląd **szacowanej ceny po Twoim zleceniu** (symulacja impactu) zanim zatwierdzisz

### Po sprzedaży (kumulatywnie w 12 m-cach)
| Próg | Skutki makro |
|---|---|
| >20% rezerw | waluta **-3%**, inflacja +0.8 pp, rating -1 stopień |
| >50% rezerw | waluta **-10%**, inflacja +3 pp, wzrost PKB -1 pp, poparcie -10 |
| >80% rezerw | 🔴 **EVENT "Kryzys zaufania do waluty"**: inflacja +8 pp (ryzyko spirali), stabilność -25, bez tarczy w kryzysach — realne ryzyko upadłości państwa |

- Nowy wskaźnik w UI: **Pokrycie waluty rezerwami** (złoto / M2) z paskiem ostrzegawczym

## 🖥️ MODUŁ 5: UI
1. **Giełda**: panel "Głębokość rynku" (ile możesz sprzedać zanim cena spadnie o 5/10/25%), wolumen absorpcji, cena szacowana po zleceniu na żywo
2. **Ekonomia**: karty kopalń (wydobycie t/rok, AISC, zysk/stratę mies., przycisk Wstrzymaj/Wznów)
3. **Bankowość**: panel rezerw złota z procentem pokrycia waluty + ostrzeżenia
4. Złoto w uncjach **i tonach** jednocześnie (18.3M oz / 570 t)

## 🧪 MODUŁ 6: Testy automatyczne (dodam do ui-smoke)
- Init: USA = 8,133 t, Polska = 570 t, świat ~36k t (±5%)
- Mega-kopalnia: +100 t do rezerw po 12 turach
- Zrzut 1000 t: złoto -30%+, srebro/spółki spadają (kontagion), odrzucenie zlecenia >40% głębokości
- Ostrzeżenie przy progu; waluta/inflacja reagują po wyprzedaży >20%
- Boty-CB: Polska rośnie w stronę 700 t

## 🔧 Techniczne
- Aktualizacja `exchange-data.js`: złoto 2,450→**4,500** (baza realna), srebro 29.5→**67** (mnożniki inflacyjne już istnieją)
- Migracja starych save'ów: brak rezerw → wg danych 2026; stare ceny → przeliczenie
- Wydajność: kontagion O(aktywa), CB-boty O(20 krajów) — brak wpływu na czas tury

## ⏱️ Kolejność prac (po Twoim "gotowe")
1. Dane + rezerwy startowe (fundament) → 2. Kopalnie → 3. Głębokość rynku + kontagion → 4. Ostrzeżenia + makro → 5. UI → 6. Testy → pełna weryfikacja (49+ testów) → commit

---

**Pytania do Ciebie (odpowiedz przy "gotowe"):**
1. ✅ zgadzasz się na ceny realne (złoto $4,500 zamiast obecnych $2,450 w grze)?
2. ✅ mega-kopalnia 50 mld $ / 100 t/rok start / 500 t/rok max — OK?
3. Czy chcecie też **srebro/platinę kopalne**, czy tylko złoto na start?
4. Wyprzedaż rezerw >80% = EVENT kryzysu walutowego — wystarczy, czy chcesz pełne "game over" (przejęcie przez MFW / hiperinflacja kończąca grę)?
