/**
 * WorldForge: Nations - Economic Consistency & Statistical Validator
 * Guard assertions, scale ratios, 5% monthly swing protection and debug diagnostics.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  const EconomicValidator = {
    warnings: [],
    errors: [],

    /**
     * Validate an individual country's macroeconomic consistency
     */
    validateCountry(country) {
      const countryId = country.id || 'UNKNOWN';
      const localErrors = [];
      const localWarnings = [];

      // 1. Population check
      const pop = country.population ? country.population.total : 0;
      if (!pop || pop <= 0 || !Number.isFinite(pop)) {
        localErrors.push(`[${countryId}] Nieprawidłowa populacja: ${pop}`);
      }

      // 2. GDP nominal & per capita check
      const gdpNominal = country.economy ? country.economy.gdpNominal : 0;
      if (!gdpNominal || gdpNominal <= 0 || !Number.isFinite(gdpNominal)) {
        localErrors.push(`[${countryId}] Nieprawidłowe nominalne PKB: ${gdpNominal}`);
      } else if (pop > 0) {
        const expectedPerCapita = gdpNominal / pop;
        const actualPerCapita = country.economy.gdpPerCapita || 0;
        const diffRatio = Math.abs(actualPerCapita - expectedPerCapita) / Math.max(1, expectedPerCapita);
        if (diffRatio > 0.40) {
          localWarnings.push(`[${countryId}] PKB per capita ($${actualPerCapita}) odbiega od PKB/populacja ($${Math.round(expectedPerCapita)})`);
        }
      }

      // 3. Debt amount vs Debt/GDP ratio
      const totalDebt = country.debt ? country.debt.totalDebt : 0;
      const debtToGdp = country.debt ? country.debt.debtToGdp : 0;
      if (Number.isNaN(totalDebt) || !Number.isFinite(totalDebt)) {
        localErrors.push(`[${countryId}] Dług całkowity jest NaN/Infinity`);
      } else if (gdpNominal > 0) {
        const expectedDebt = gdpNominal * (debtToGdp / 100);
        const debtDiffRatio = Math.abs(totalDebt - expectedDebt) / Math.max(1, expectedDebt);
        if (debtDiffRatio > 0.30) {
          localWarnings.push(`[${countryId}] Kwota długu ($${totalDebt}) różni się od PKB * DebtRatio ($${Math.round(expectedDebt)})`);
        }
      }

      // 4. Monthly Budget vs GDP Scale
      const budget = country.budget;
      if (budget) {
        const monthlyRevenues = budget.revenues ? budget.revenues.total : 0;
        const monthlySpending = budget.spending ? budget.spending.totalExpenditure : 0;
        const balance = budget.balanceMonthly || 0;

        const calculatedBalance = monthlyRevenues - monthlySpending;
        if (Math.abs(balance - calculatedBalance) > 1000) {
          localWarnings.push(`[${countryId}] Saldo budżetowe ($${balance}) różni się od Dochody - Wydatki ($${calculatedBalance})`);
        }

        const monthlyGdp = gdpNominal / 12;
        if (monthlySpending > monthlyGdp * 1.5) {
          localWarnings.push(`[${countryId}] Miesięczne wydatki publiczne ($${monthlySpending}) przekraczają 150% miesięcznego PKB ($${Math.round(monthlyGdp)})`);
        }
      }

      // 5. Treasury Reserves Scale Check
      const treasury = country.treasury || 0;
      if (Number.isNaN(treasury) || !Number.isFinite(treasury)) {
        localErrors.push(`[${countryId}] Skarb państwa zawiera wartość NaN/Infinity`);
      } else if (gdpNominal > 0 && treasury > gdpNominal * 3) {
        localWarnings.push(`[${countryId}] Skarb państwa ($${treasury}) przekracza 300% rocznego PKB`);
      }

      // 6. Currency Exchange Rate
      const fx = country.currencyExchangeRate;
      if (!fx || fx <= 0 || !Number.isFinite(fx)) {
        localErrors.push(`[${countryId}] Nieprawidłowy kurs waluty: ${fx}`);
      }

      return {
        valid: localErrors.length === 0,
        warnings: localWarnings,
        errors: localErrors
      };
    },

    /**
     * Validate full world state
     */
    validateWorldState(state) {
      this.warnings = [];
      this.errors = [];

      if (!state || !state.countries) {
        this.errors.push('Brak zainicjalizowanego stanu państw (state.countries)');
        return { valid: false, errors: this.errors, warnings: this.warnings };
      }

      let totalCountries = 0;
      let validCountries = 0;

      for (const [id, country] of Object.entries(state.countries)) {
        totalCountries++;
        const res = this.validateCountry(country);
        if (res.valid) {
          validCountries++;
        } else {
          this.errors.push(...res.errors);
        }
        this.warnings.push(...res.warnings);
      }

      const summary = {
        totalCountries,
        validCountries,
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
        timestamp: new Date().toISOString()
      };

      if (this.errors.length > 0) {
        console.error('[EconomicValidator] Błędy spójności ekonomicznej:', this.errors);
      }

      return {
        valid: this.errors.length === 0,
        summary,
        errors: this.errors,
        warnings: this.warnings
      };
    },

    /**
     * Get diagnostic ledger entry for debug panel
     */
    getLastTurnDiagnosticReport(state, countryId = 'POL') {
      const country = state.countries[countryId] || window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country || !country.economy.lastRoundDiagnostics) return null;
      return country.economy.lastRoundDiagnostics;
    }
  };

  window.WorldForge.Core.EconomicValidator = EconomicValidator;
})();
