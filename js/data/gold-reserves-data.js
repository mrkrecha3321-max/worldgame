/**
 * WorldForge: Nations - Realne rezerwy złota banków centralnych (stan: 2026)
 * Źródła: World Gold Council / IMF IFS (Q1-Q2 2026),公 official NBP/PBoC data.
 * 1 tona = 32,150.7 uncji trojańskiej.
 *
 * Dodatkowo: polityka CB botów (kto skupuje, kto sprzedaje) oraz realna
 * roczna produkcja kopalń per kraj (do specjalizacji botów-górników).
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  const OZ_PER_TONNE = 32150.7;

  window.WorldForge.Data.GoldReserves = {
    OZ_PER_TONNE: OZ_PER_TONNE,

    /** Rezerwy 2026 w tonach (uśrednione z WGC/IFS za 2026). */
    reservesTonnes: {
      USA: 8133.5, DEU: 3350.3, ITA: 2451.8, FRA: 2437.0, RUS: 2310.0, CHN: 2310.0,
      CHE: 1040.0, IND: 880.3, JPN: 846.0, NLD: 612.5, TUR: 570.0, POL: 570.0,
      TWN: 423.9, UZB: 400.0, PRT: 382.7, KAZ: 354.0, SAU: 323.1, GBR: 310.3,
      LBN: 286.8, ESP: 281.6, AUT: 280.0, BEL: 227.4, KOR: 104.4, THA: 244.2,
      SGP: 153.7, SWE: 125.7, MEX: 120.1, BRA: 129.7, ARE: 127.4, ZAF: 125.4,
      ARG: 61.7, AUS: 79.9, CAN: 0.0, NOR: 0.0, GRC: 112.8, IDN: 78.3,
      MYS: 88.2, PHL: 76.6, KWT: 79.0, EGY: 126.0, IRQ: 96.3,
      JOR: 47.2, SYR: 25.9, YEM: 15.7, LBY: 81.7, DZA: 77.6, MAR: 22.1,
      TUN: 20.0, NGA: 21.4, GHA: 8.7, CIV: 6.7, SEN: 11.7, MLI: 10.8,
      KEN: 4.1, TZA: 4.0, ETH: 8.7, UGA: 3.5, ZMB: 1.4, ZWE: 5.8,
      MOZ: 3.5, AGO: 9.7, CMR: 2.7, COD: 26.9, VEN: 161.8, ECU: 26.3,
      COL: 9.5, PER: 34.7, CHL: 1.2, BOL: 42.5, PRY: 8.2, URY: 19.4,
      CRI: 3.2, PAN: 5.2, DOM: 8.6, CUB: 26.7, ISL: 5.5, IRL: 13.3,
      FIN: 25.8, DNK: 66.5, LUX: 9.5, CZK: 30.5, SVK: 31.7, HUN: 95.5,
      ROU: 103.7, BGR: 40.2, SRB: 29.2, HRV: 16.6, BIH: 4.5, MKD: 7.5,
      ALB: 12.4, MDA: 3.0, UKR: 27.1, BLR: 45.2, GEO: 7.0, ARM: 132.9,
      AZE: 22.5, KGZ: 2.6, TKM: 26.3, TJK: 1.7,
      MNG: 15.5, PAK: 64.4, BGD: 24.2, LKA: 16.1, NPL: 8.0, MMR: 27.2,
      KHM: 41.4, LAO: 8.7, VNM: 50.0, PRK: 102.0, MHL: 0, FJI: 0.5,
      PNG: 1.9, SLB: 1.6, VUT: 0.4, WS: 0.3, TLS: 0.2, BRN: 3.4,
      QAT: 71.7, OMN: 43.7, BHR: 11.2,
    },

    /** Polityka złotowa banków centralnych (miesięcznie, tony; +skup / -sprzedaż). */
    cbPolicies: [
      { id: 'POL', action: 'BUY', monthlyTonnes: 10, targetTonnes: 700, note: 'NBP: oficjalny cel 700 t (przyjęty I 2026)' },
      { id: 'CHN', action: 'BUY', monthlyTonnes: 7, targetTonnes: 2600, note: 'PBoC: 17+ miesięcy ciągłych zakupów' },
      { id: 'TUR', action: 'BUY', monthlyTonnes: 4, targetTonnes: 650, note: 'TCMB: akumulacja z udziałem banków komercyjnych' },
      { id: 'IND', action: 'BUY', monthlyTonnes: 3, targetTonnes: 1000, note: 'RBI: dywersyfikacja z USD' },
      { id: 'KAZ', action: 'BUY', monthlyTonnes: 2, targetTonnes: 450, note: 'NBK: producent górniczy, odbudowa rezerw' },
      { id: 'UZB', action: 'BUY', monthlyTonnes: 2, targetTonnes: 500, note: 'CBU: nadwyżki wydobycia Muruntau' },
      { id: 'CZE', action: 'BUY', monthlyTonnes: 1, targetTonnes: 80, note: 'CNB: 21 miesięcy ciągłych zakupów' },
      { id: 'RUS', action: 'SELL', monthlyTonnes: 15, floorTonnes: 1800, note: 'CBR: sprzedaż złota NWF od XI 2025' },
      { id: 'DEU', action: 'SELL', monthlyTonnes: 1, floorTonnes: 3300, note: 'BuBa: symboliczne coroczne redukcje' }
    ],

    /** Realna roczna produkcja kopalń (2025, tony) — dla specjalizacji botów. */
    annualMineProduction: {
      CHN: 380, RUS: 330, AUS: 284, CAN: 170, USA: 160,
      GHA: 130, PER: 125, IND: 95, MEX: 110,
      KAZ: 100, UZB: 105, ZAF: 95, BRA: 85, BFA: 70,
      MLI: 62, SUR: 61, ARG: 55, TZA: 55, ZWE: 45,
      PNG: 45, DOM: 32, BOL: 30, ECU: 25, FIN: 20,
      SWE: 20, KOR: 8, JPN: 6, POL: 6, ESP: 2,
      TUR: 42, KGZ: 25, LAO: 18, ETH: 25, SLE: 10,
      GIN: 35, CIV: 30, COD: 35, NER: 15, NAM: 15
    },

    /** Światowe parametry rynku (WGC 2025/2026). */
    world: {
      annualProductionTonnes: 3672,   // rekord 2025
      monthlyProductionTonnes: 306,
      centralBankTotalTonnes: 36000,  // >36 tys. t w skarbcach CB świata
      aboveGroundTonnes: 218000       // wszystko złoto kiedykolwiek wydobyte
    },

    /**
     * Rezerwy w uncjach dla kraju (z fallbackiem heurystycznym dla pominiętych).
     */
    reservesOz(countryId, gdpNominal) {
      const t = this.reservesTonnes[countryId];
      if (t !== undefined) return Math.round(t * OZ_PER_TONNE);
      // Heurystyka dla reszty świata: 0.2-0.6% PKB w złocie
      const est = Math.round((gdpNominal || 5e10) * 0.004 / 145000000 * OZ_PER_TONNE);
      return Math.max(0, est);
    }
  };

  console.log('[WorldForge] Wczytano realne rezerwy złota 2026 (świat CB: ~36 000 t, Polska: 570 t).');
})();
