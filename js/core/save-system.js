/**
 * WorldForge: Nations - Save & Load System with Version Migration & Scale Repair
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  const SaveSystem = {
    SLOTS: ['autosave', 'slot1', 'slot2', 'slot3'],

    getStorageKey(slotName) {
      return `${window.WorldForge.CONFIG.SAVE_KEY_PREFIX}${slotName}`;
    },

    saveGame(slotName = 'autosave') {
      try {
        const stateManager = window.WorldForge.Core.GameState;
        const state = stateManager ? stateManager.getState() : null;
        if (!state) return false;

        const sanitized = window.WorldForge.Core.Validators.sanitizeStateObject(state);
        // Zaokrąglanie liczb do 4 miejsc po przecinku zmniejsza objętość zapisu
        // (eliminuje artefakty typu 0.30000000000000004) bez straty sensownej precyzji.
        const serialized = JSON.stringify({
          version: window.WorldForge.CONFIG.SAVE_VERSION,
          savedAt: new Date().toISOString(),
          slotName: slotName,
          state: sanitized,
          rngState: window.WorldForge.Core.Random.getState()
        }, (key, value) => (typeof value === 'number' && isFinite(value) ? Math.round(value * 10000) / 10000 : value));

        try {
          localStorage.setItem(this.getStorageKey(slotName), serialized);
        } catch (quotaErr) {
          // Fallback przy przekroczeniu limitu localStorage: zwolnij najstarsze
          // pozostałe sloty i spróbuj zapisać ponownie (priorytet: bieżący slot).
          const evictOrder = ['slot3', 'slot2', 'slot1', 'autosave'].filter(s => s !== slotName);
          for (const victim of evictOrder) {
            try { localStorage.removeItem(this.getStorageKey(victim)); } catch (e) { /* ignoruj */ }
            try {
              localStorage.setItem(this.getStorageKey(slotName), serialized);
              console.warn(`[SaveSystem] Limit localStorage! Zwolniono slot "${victim}", by zapisać "${slotName}".`);
              return true;
            } catch (e) { /* próbuj dalej */ }
          }
          throw quotaErr;
        }

        console.log(`[SaveSystem] Stan gry zapisany do slotu ${slotName} (wersja v${window.WorldForge.CONFIG.SAVE_VERSION})`);
        return true;
      } catch (err) {
        console.error('[SaveSystem] Błąd zapisu gry:', err);
        return false;
      }
    },

    loadGame(slotName = 'autosave') {
      try {
        const key = this.getStorageKey(slotName);
        const dataStr = localStorage.getItem(key);
        if (!dataStr) return false;

        const parsed = JSON.parse(dataStr);
        if (!parsed || !parsed.state) throw new Error('Uszkodzona struktura pliku zapisu');

        // Check for scale migration requirement
        if (parsed.version < 2 || this.detectScaleAnomaly(parsed.state)) {
          console.warn('[SaveSystem] Wykryto zapis ze starej wersji skali. Przeprowadzam automatyczną migrację jednostek...');
          this.repairSaveEconomy(parsed.state);
        }

        if (parsed.rngState) {
          window.WorldForge.Core.Random.restoreState(parsed.rngState);
        }

        window.WorldForge.Core.GameState.state = parsed.state;
        // Migracja starych zapisów: rynek giełdowy musi istnieć w stanie gry
        window.WorldForge.Core.GameState.ensureExchangeMarket();
        window.WorldForge.Core.GameState.notifySubscribers('gameLoaded', parsed.state);
        return true;
      } catch (err) {
        console.error(`[SaveSystem] Błąd wczytywania z ${slotName}:`, err);
        return false;
      }
    },

    detectScaleAnomaly(state) {
      if (!state || !state.countries) return false;
      const pol = state.countries['POL'];
      const usa = state.countries['USA'];
      if (pol && pol.economy.gdpNominal < 100000000000) return true; // Less than 100B
      if (usa && usa.economy.gdpNominal < 5000000000000) return true;  // Less than 5T
      return false;
    },

    repairSaveEconomy(state) {
      const countriesCatalog = window.WorldForge.Data.Countries || [];
      for (const cData of countriesCatalog) {
        const c = state.countries[cData.id];
        if (c) {
          if (c.economy.gdpNominal < 10000000000) {
            c.economy.gdpNominal = cData.gdpNominal;
            c.economy.gdpReal = cData.gdpNominal;
            c.economy.gdpPerCapita = cData.gdpPerCapita;
            c.treasury = cData.treasury;
            c.debt.totalDebt = cData.debtNominal;
          }
        }
      }
      return state;
    },

    listSaveSlots() {
      const summaries = [];
      for (const slot of this.SLOTS) {
        const key = this.getStorageKey(slot);
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const state = data.state;
            const country = state.countries ? state.countries[state.playerCountryId] : null;
            summaries.push({
              slot: slot,
              exists: true,
              version: data.version || 1,
              savedAt: data.savedAt,
              turn: state.time?.currentTurn || 1,
              dateFormatted: window.WorldForge.Format.formatTurnDate(state.time?.startDate, state.time?.currentTurn).formatted,
              playerCountryId: state.playerCountryId,
              playerCountryName: country ? country.namePl : state.playerCountryId,
              playerFlag: country ? country.flag : '🌐',
              gdp: country ? country.economy.gdpNominal : 0,
              treasury: country ? country.treasury : 0
            });
          } catch (e) {
            summaries.push({ slot: slot, exists: true, corrupt: true });
          }
        } else {
          summaries.push({ slot: slot, exists: false });
        }
      }
      return summaries;
    },

    hasAnySave() {
      return this.SLOTS.some(slot => !!localStorage.getItem(this.getStorageKey(slot)));
    },

    getLatestSaveSlot() {
      let latestSlot = null;
      let latestTime = 0;
      for (const slot of this.SLOTS) {
        const raw = localStorage.getItem(this.getStorageKey(slot));
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const t = new Date(data.savedAt).getTime();
            if (t > latestTime) {
              latestTime = t;
              latestSlot = slot;
            }
          } catch (e) {}
        }
      }
      return latestSlot || 'autosave';
    },

    deleteSave(slotName) {
      localStorage.removeItem(this.getStorageKey(slotName));
      return true;
    },

    exportToJson() {
      const state = window.WorldForge.Core.GameState.getState();
      if (!state) return null;
      const exportObj = {
        app: window.WorldForge.GAME_TITLE,
        version: window.WorldForge.CONFIG.SAVE_VERSION,
        exportedAt: new Date().toISOString(),
        state: state,
        rngState: window.WorldForge.Core.Random.getState()
      };
      const jsonStr = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const countryCode = state.playerCountryId || 'NAT';
      const turn = state.time?.currentTurn || 1;
      a.href = url;
      a.download = `WorldForge_${countryCode}_Tura${turn}_v${window.WorldForge.CONFIG.SAVE_VERSION}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    },

    importFromJsonText(jsonText) {
      try {
        const data = JSON.parse(jsonText);
        if (!data || !data.state) throw new Error('Nieprawidłowy format pliku zapisu');
        if (this.detectScaleAnomaly(data.state)) {
          this.repairSaveEconomy(data.state);
        }
        if (data.rngState) {
          window.WorldForge.Core.Random.restoreState(data.rngState);
        }
        window.WorldForge.Core.GameState.state = data.state;
        window.WorldForge.Core.GameState.notifySubscribers('gameLoaded', data.state);
        return { success: true };
      } catch (err) {
        return { success: false, reason: err.message };
      }
    }
  };

  window.WorldForge.Core.SaveSystem = SaveSystem;
})();
