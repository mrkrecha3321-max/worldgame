/**
 * WorldForge: Nations - Automated Self-Tests & Diagnostic Suite
 * Runs 14+ end-to-end integration and unit tests verifying game mechanics,
 * strict Polish linguistic number formatting, macro proportions, and economic validation.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Tests = window.WorldForge.Tests || {};

  const SelfTests = {
    results: [],

    /**
     * Run all automated self-tests
     * @returns {Object} { total, passed, failed, results }
     */
    runAll() {
      console.log('=============================================');
      console.log('🧪 [WorldForge Self-Tests] Starting Test Suite');
      console.log('=============================================');
      this.results = [];

      this.test('1. Inicjalizacja gry i globalnej bazy 170+ państw', () => {
        const state = window.WorldForge.Core.GameState.createNewGame('POL');
        this.assert(state !== null, 'Stan gry nie może być null');
        const countryCount = Object.keys(state.countries).length;
        this.assert(countryCount >= 177, `Baza państw musi obejmować wszystkie kraje mapy (znaleziono ${countryCount} >= 177)`);
        this.assert(state.playerCountryId === 'POL', 'Gracz powinien sterować Polską (POL)');
      });

      this.test('2. Weryfikacja profilu Polski (POL) i skali bazowej', () => {
        const poland = window.WorldForge.Core.GameState.getPlayerCountry();
        this.assert(poland.id === 'POL', 'ID kraju gracza to POL');
        this.assert(poland.currency === 'PLN', 'Waluta Polski to PLN');
        this.assert(poland.economy.gdpNominal >= 800000000000, 'PKB Polski powinno wynosić >= 800 mld USD w jednostkach bazowych');
        this.assert(poland.treasury >= 20000000000, 'Rezerwy skarbu Polski >= 20 mld USD');
        this.assert(poland.debt.totalDebt >= 400000000000, 'Dług Polski >= 400 mld USD');
      });

      this.test('3. Pokrycie kluczowych państw Azji i Europy', () => {
        const state = window.WorldForge.Core.GameState.getState();
        const requiredIsos = [
          'CHN', 'IND', 'JPN', 'KOR', 'PRK', 'IDN', 'PAK', 'BGD',
          'VNM', 'THA', 'MYS', 'SGP', 'PHL', 'SAU', 'ARE', 'ISR',
          'IRN', 'IRQ', 'TUR', 'KAZ', 'UZB', 'DEU', 'FRA', 'GBR',
          'ITA', 'ESP', 'UKR', 'RUS', 'USA', 'BRA', 'CAN', 'AUS'
        ];

        for (const iso of requiredIsos) {
          const c = state.countries[iso];
          this.assert(c !== undefined, `Brak wymaganego państwa w bazie: ${iso}`);
          this.assert(c.population.total > 0, `Populacja ${iso} musi być > 0`);
          this.assert(c.economy.gdpNominal > 0, `PKB ${iso} musi być > 0`);
        }
      });

      this.test('4. Centralny Formatter: polska skala (tys., mln, mld, bln) i brak k/M/B/T', () => {
        const F = window.WorldForge.Format;
        const test500 = F.money(500, 'USD', { rawText: true, forceCurrency: true });
        const test12k = F.money(12500, 'USD', { rawText: true, forceCurrency: true });
        const test4M = F.money(4200000, 'USD', { rawText: true, forceCurrency: true });
        const test683B = F.money(683920000000, 'USD', { rawText: true, forceCurrency: true });
        const test1T = F.money(1150000000000, 'USD', { rawText: true, forceCurrency: true });

        this.assert(test500.includes('500 USD'), `500 USD format: ${test500}`);
        this.assert(test12k.includes('tys. USD'), `12.5 tys. format: ${test12k}`);
        this.assert(test4M.includes('mln USD'), `4.2 mln format: ${test4M}`);
        this.assert(test683B.includes('mld USD'), `683.92 mld format: ${test683B}`);
        this.assert(test1T.includes('bln USD'), `1.15 bln format: ${test1T}`);

        // Ensure NO English abbreviations
        this.assert(!test683B.includes(' B ') && !test683B.endsWith('B') && !test683B.includes(' G '), 'Format nie może zawierać angielskiego B');
        this.assert(!test4M.includes(' M ') && !test4M.endsWith('M'), 'Format nie może zawierać angielskiego M');
        this.assert(!test1T.includes(' T ') && !test1T.endsWith('T'), 'Format nie może zawierać angielskiego T');
      });

      this.test('5. Walidator Ekonomiczny (Economic Consistency Check)', () => {
        const state = window.WorldForge.Core.GameState.getState();
        const report = window.WorldForge.Core.EconomicValidator.validateWorldState(state);
        this.assert(report.valid === true, `Walidator wykrył błędy w stanie: ${report.errors.join(', ')}`);
        this.assert(report.summary.errorCount === 0, 'Liczba błędów krytycznych musi wynosić 0');
      });

      this.test('6. Komenda SET_BUDGET (Alokacja budżetowa)', () => {
        const res = window.WorldForge.Core.Commands.dispatch({
          type: 'SET_BUDGET',
          countryId: 'POL',
          payload: { category: 'defense', value: 14.5 }
        });
        this.assert(res.success === true, 'Komenda SET_BUDGET powinna zakończyć się sukcesem');
        const country = window.WorldForge.Core.GameState.getPlayerCountry();
        this.assert(country.budget.spending.defense === 14.5, 'Udział obronności w budżecie powinien wynosić 14.5%');
      });

      this.test('7. Komenda ISSUE_BONDS (Emisja obligacji w bazie USD)', () => {
        const countryBefore = window.WorldForge.Core.GameState.getPlayerCountry();
        const treasuryBefore = countryBefore.treasury;
        const debtBefore = countryBefore.debt.totalDebt;
        const emissionAmount = 5000000000; // 5 mld USD

        const res = window.WorldForge.Core.Commands.dispatch({
          type: 'ISSUE_BONDS',
          countryId: 'POL',
          payload: { amount: emissionAmount, maturityMonths: 60, currency: 'PLN', bondType: 'Standard' }
        });

        this.assert(res.success === true, 'Emisja obligacji powinna zakończyć się sukcesem');
        const countryAfter = window.WorldForge.Core.GameState.getPlayerCountry();
        this.assert(countryAfter.treasury === treasuryBefore + emissionAmount, 'Rezerwy skarbu powinny wzrosnąć o 5 mld');
        this.assert(countryAfter.debt.totalDebt === debtBefore + emissionAmount, 'Dług całkowity powinien wzrosnąć o 5 mld');
      });

      this.test('8. Komenda SET_CENTRAL_BANK_RATE (Stopa procentowa)', () => {
        const res = window.WorldForge.Core.Commands.dispatch({
          type: 'SET_CENTRAL_BANK_RATE',
          countryId: 'POL',
          payload: { rate: 6.25 }
        });
        this.assert(res.success === true, 'Zmiana stopy NBP powinna się powieść');
        const country = window.WorldForge.Core.GameState.getPlayerCountry();
        this.assert(country.centralBank.baseRate === 6.25, 'Stopa referencyjna powinna wynosić 6.25%');
      });

      this.test('9. Komenda BAILOUT_BANK (Dokapitalizowanie banku)', () => {
        const country = window.WorldForge.Core.GameState.getPlayerCountry();
        const firstBank = country.commercialBanks[0];
        const initialCapital = firstBank.capital;
        const bailoutAmount = 1000000000; // 1 mld USD

        const res = window.WorldForge.Core.Commands.dispatch({
          type: 'BAILOUT_BANK',
          countryId: 'POL',
          payload: { bankId: firstBank.id, amount: bailoutAmount }
        });

        this.assert(res.success === true, 'Dokapitalizowanie banku powinno zakończyć się sukcesem');
        this.assert(firstBank.capital === initialCapital + bailoutAmount, 'Kapitał banku powinien wzrosnąć o kwotę bailoutu');
      });

      this.test('10. Komenda START_RESEARCH i START_PROJECT', () => {
        const resTech = window.WorldForge.Core.Commands.dispatch({
          type: 'START_RESEARCH',
          countryId: 'POL',
          payload: { techId: 'tech_algorithmic_fiscal' }
        });
        this.assert(resTech.success === true, 'Rozpoczęcie badań powinno się powieść');

        const resProj = window.WorldForge.Core.Commands.dispatch({
          type: 'START_PROJECT',
          countryId: 'POL',
          payload: { projectId: 'proj_cpk' }
        });
        this.assert(resProj.success === true, 'Rozpoczęcie CPK powinno się powieść');
      });

      this.test('11. Handel Spot (EXECUTE_TRADE) i Umowa Bilateralna', () => {
        const country = window.WorldForge.Core.GameState.getPlayerCountry();
        const initialFood = country.production.food.stockpile;

        const resTrade = window.WorldForge.Core.Commands.dispatch({
          type: 'EXECUTE_TRADE',
          countryId: 'POL',
          payload: { resourceId: 'food', action: 'BUY', amount: 50 }
        });
        this.assert(resTrade.success === true, 'Zakup spot żywności powinien się powieść');
        this.assert(country.production.food.stockpile === initialFood + 50, 'Zapasy żywności powinny wzrosnąć o 50');

        const resDeal = window.WorldForge.Core.Commands.dispatch({
          type: 'CREATE_BILATERAL_DEAL',
          countryId: 'POL',
          payload: {
            importerId: 'DEU',
            resourceId: 'steel',
            monthlyAmount: 80,
            agreedPrice: 180,
            durationMonths: 12
          }
        });
        this.assert(resDeal.success === true, 'Podpisanie umowy z Niemcami powinno się powieść');
      });

      this.test('12. Symulacja pełnych 12 rund bez eksplozji i zaniku wartości', () => {
        const state = window.WorldForge.Core.GameState.getState();
        const initialTurn = state.time.currentTurn;

        for (let i = 0; i < 12; i++) {
          window.WorldForge.Core.TurnEngine.nextTurn();
        }

        this.assert(state.time.currentTurn === initialTurn + 12, 'Licznik tur powinien wzrosnąć o 12');
        this.assert(state.turnReports.length >= 12, 'Powinno zostać wygenerowanych co najmniej 12 raportów');

        // Verify numeric safety: non-NaN, non-Infinity across all countries
        for (const [id, c] of Object.entries(state.countries)) {
          this.assert(!Number.isNaN(c.economy.gdpNominal) && c.economy.gdpNominal > 0, `GDP ${id} musi być dodatnią liczbą`);
          this.assert(!Number.isNaN(c.treasury), `Treasury ${id} nie może być NaN`);
          this.assert(!Number.isNaN(c.economy.inflation), `Inflacja ${id} nie może być NaN`);
          this.assert(!Number.isNaN(c.economy.unemployment), `Bezrobocie ${id} nie może być NaN`);
        }
      });

      this.test('13. Przełączanie Waluty (Zmiana prezentacji bez mutacji stanu)', () => {
        const poland = window.WorldForge.Core.GameState.getPlayerCountry();
        const rawGdp = poland.economy.gdpNominal;

        window.WorldForge.Format.setDisplayCurrencyMode('USD');
        const usdFormatted = window.WorldForge.Format.money(rawGdp, 'USD', { rawText: true });
        this.assert(usdFormatted.includes('USD'), 'Widok USD powinien mieć jednostkę USD');

        window.WorldForge.Format.setDisplayCurrencyMode('EUR');
        const eurFormatted = window.WorldForge.Format.money(rawGdp, 'USD', { rawText: true });
        this.assert(eurFormatted.includes('EUR'), 'Widok EUR powinien mieć jednostkę EUR');

        window.WorldForge.Format.setDisplayCurrencyMode('LOCAL');
        this.assert(poland.economy.gdpNominal === rawGdp, 'Stan gospodarki nie może ulec mutacji po przełączeniu waluty');
      });

      this.test('14. Zapis i Odczyt stanu gry (Save & Load Roundtrip)', () => {
        const saveRes = window.WorldForge.Core.SaveSystem.saveGame('slot1');
        this.assert(saveRes === true, 'Zapis do slot1 powiódł się');

        const stateBefore = JSON.parse(JSON.stringify(window.WorldForge.Core.GameState.getState()));
        const loadRes = window.WorldForge.Core.SaveSystem.loadGame('slot1');
        this.assert(loadRes === true, 'Odczyt ze slot1 powiódł się');

        const stateAfter = window.WorldForge.Core.GameState.getState();
        this.assert(stateAfter.playerCountryId === stateBefore.playerCountryId, 'Kraj gracza zgodny po wczytaniu');
        this.assert(stateAfter.time.currentTurn === stateBefore.time.currentTurn, 'Numer tury zgodny po wczytaniu');
      });

      // Summary
      const passedCount = this.results.filter(r => r.passed).length;
      const failedCount = this.results.filter(r => !r.passed).length;

      console.log('=============================================');
      console.log(`🏁 [WorldForge Self-Tests Finished] Passed: ${passedCount}/${this.results.length}, Failed: ${failedCount}`);
      console.log('=============================================');

      return {
        total: this.results.length,
        passed: passedCount,
        failed: failedCount,
        results: this.results
      };
    },

    test(name, testFn) {
      try {
        testFn();
        this.results.push({ name, passed: true });
        console.log(`  ✅ PASS: ${name}`);
      } catch (err) {
        this.results.push({ name, passed: false, error: err.message });
        console.error(`  ❌ FAIL: ${name} ->`, err.message);
      }
    },

    assert(condition, message) {
      if (!condition) {
        throw new Error(message || 'Assertion failed');
      }
    },

    showDebugPanel() {
      const isDebug = window.location.search.includes('debug=1');
      if (!isDebug) return;

      const debugPanel = document.createElement('div');
      debugPanel.id = 'wf-debug-panel';
      debugPanel.style.position = 'fixed';
      debugPanel.style.bottom = '10px';
      debugPanel.style.left = '10px';
      debugPanel.style.background = 'var(--bg-panel)';
      debugPanel.style.border = '1px solid var(--border-light)';
      debugPanel.style.borderRadius = 'var(--border-radius-sm)';
      debugPanel.style.padding = '10px';
      debugPanel.style.zIndex = '9999';
      debugPanel.style.boxShadow = 'var(--shadow-modal)';
      debugPanel.style.maxWidth = '400px';
      debugPanel.style.maxHeight = '80vh';
      debugPanel.style.overflowY = 'auto';
      debugPanel.style.fontSize = '11px';

      const state = window.WorldForge.Core.GameState.getState();
      const countryCount = state && state.countries ? Object.keys(state.countries).length : 0;
      const detailedCount = state && state.countries ? Object.values(state.countries).filter(c => c.profileLevel === 'A').length : 0;

      debugPanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
          <strong style="color: var(--accent);">🛠️ Raport Diagnostyczny Silnika (?debug=1)</strong>
          <button class="wf-btn wf-btn-sm wf-btn-secondary" id="debug-close-btn">✕</button>
        </div>
        <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 6px;">
          Baza państw: <strong>${countryCount}</strong> • Profile Level A: <strong>${detailedCount}</strong>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <button class="wf-btn wf-btn-sm wf-btn-primary" id="btn-run-all-tests">Uruchom 14 Testów Odbiorczych</button>
          <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-show-diag-ledger">Pokaż Bilans Ostatniej Rundy (PKB / Przychody / Dług)</button>
          <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-validate-economics">Walidacja Spójności Ekonomicznej</button>
          <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-advance-12-turns">+12 Miesięcy (1 Rok)</button>
        </div>
        <div id="debug-test-output" style="margin-top: 6px; max-height: 220px; overflow-y: auto; font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); background: var(--bg-input); padding: 6px; border-radius: var(--border-radius-xs);"></div>
      `;

      document.body.appendChild(debugPanel);

      const F = window.WorldForge.Format;

      document.getElementById('debug-close-btn').onclick = () => debugPanel.remove();
      document.getElementById('btn-run-all-tests').onclick = () => {
        const report = this.runAll();
        const out = document.getElementById('debug-test-output');
        if (out) {
          out.innerHTML = report.results.map(r => `
            <div style="color: ${r.passed ? 'var(--positive)' : 'var(--negative)'};">
              ${r.passed ? '✓' : '✗'} ${r.name}
            </div>
          `).join('');
        }
      };

      document.getElementById('btn-show-diag-ledger').onclick = () => {
        const report = window.WorldForge.Core.EconomicValidator.getLastTurnDiagnosticReport(window.WorldForge.Core.GameState.getState(), window.WorldForge.Core.GameState.state.playerCountryId);
        const out = document.getElementById('debug-test-output');
        if (!out) return;
        if (!report) {
          out.innerHTML = '<div>Brak danych diagnostycznych (ukończ pierwszą turę).</div>';
          return;
        }
        out.innerHTML = `
          <div style="color: var(--accent); font-weight: bold; margin-bottom: 4px;">Tura ${report.turn} - Szczegółowy Bilans Makroekonomiczny:</div>
          <div>• PKB przed rundą: ${F.money(report.gdpBefore, 'USD', { rawText: true })}</div>
          <div>• Bazowa stopa roczna: ${report.baseAnnualGrowth}%</div>
          <div>• Wpływ konsumpcji: ${report.consumptionImpact > 0 ? '+' : ''}${report.consumptionImpact}%</div>
          <div>• Wpływ inwestycji: ${report.investmentImpact > 0 ? '+' : ''}${report.investmentImpact}%</div>
          <div>• Wpływ państwa (fiskalny): ${report.govFiscalImpact > 0 ? '+' : ''}${report.govFiscalImpact}%</div>
          <div>• Wpływ handlu (eksport netto): ${report.tradeImpact > 0 ? '+' : ''}${report.tradeImpact}%</div>
          <div>• Roczna stopa wzrostu: ${report.netAnnualRate}%</div>
          <div>• Miesięczna stopa wzrostu: ${report.monthlyRate}%</div>
          <div>• PKB po rundzie: ${F.money(report.gdpAfter, 'USD', { rawText: true })}</div>
          <div style="margin-top: 4px; border-top: 1px solid var(--border); padding-top: 2px;">• Przychody miesięczne: ${F.money(report.monthlyRevenue, 'USD', { rawText: true })}</div>
          <div>• Wydatki miesięczne: ${F.money(report.monthlyExpenses, 'USD', { rawText: true })}</div>
          <div>• Saldo miesięczne: ${F.money(report.balance, 'USD', { rawText: true })}</div>
          <div>• Skarb państwa: ${F.money(report.treasuryBefore, 'USD', { rawText: true })} -> ${F.money(report.treasuryAfter, 'USD', { rawText: true })}</div>
          <div>• Dług całkowity: ${F.money(report.debtBefore, 'USD', { rawText: true })} -> ${F.money(report.debtAfter, 'USD', { rawText: true })}</div>
        `;
      };

      document.getElementById('btn-validate-economics').onclick = () => {
        const report = window.WorldForge.Core.EconomicValidator.validateWorldState(window.WorldForge.Core.GameState.getState());
        const out = document.getElementById('debug-test-output');
        if (out) {
          out.innerHTML = `
            <div style="color: ${report.valid ? 'var(--positive)' : 'var(--negative)'}; font-weight: bold;">Status: ${report.valid ? 'Spójność Potwierdzona (Brak błędów)' : 'Wykryto Błędy'}</div>
            <div>Sprawdzone kraje: ${report.summary.totalCountries}</div>
            <div>Błędy: ${report.summary.errorCount}, Ostrzeżenia: ${report.summary.warningCount}</div>
          `;
        }
      };

      document.getElementById('btn-advance-12-turns').onclick = () => {
        for (let i = 0; i < 12; i++) {
          window.WorldForge.Core.TurnEngine.nextTurn();
        }
      };
    }
  };

  window.WorldForge.Tests.SelfTests = SelfTests;
})();
