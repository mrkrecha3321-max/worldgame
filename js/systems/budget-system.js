/**
 * WorldForge: Nations - State Budget System
 * Realistic fiscal flows: monthly primary balance, debt servicing, no silent magic refills,
 * emergency liquidity loan triggers.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const BudgetSystem = {
    /**
     * Process monthly state budget execution
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const budget = country.budget;
          const eco = country.economy;
          const spending = budget.spending;
          const rev = budget.revenues;

          // Benchmark baseline monthly government primary expenditure: ~33% of monthly GDP
          // (dopasowany do realnych dochodów podatkowych ~33% PKB, by saldo domyślne
          // oscylowało wokół zera zamiast trwałej strukturalnej nadwyżki)
          const monthlyGdp = eco.gdpNominal / 12;
          const baselinePublicSpendingMonthly = monthlyGdp * 0.333;

          let primarySpendingTotal = 0;
          const categories = [
            'health', 'education', 'pensions', 'socialWelfare',
            'defense', 'infrastructure', 'energy', 'research',
            'publicSafety', 'administration', 'environment', 'subsidies'
          ];

          for (const cat of categories) {
            const share = V.clampPercent(spending[cat] || 6.5);
            const amount = Math.round(baselinePublicSpendingMonthly * (share / 100));
            primarySpendingTotal += amount;
          }

          // Add debt interest servicing
          const debtCost = spending.debtServicing || 0;
          spending.totalExpenditure = primarySpendingTotal + debtCost;

          // Compute Primary Balance (Revenues minus non-interest spending)
          budget.primaryBalance = rev.total - primarySpendingTotal;

          // Compute Net Monthly Fiscal Balance
          budget.balanceMonthly = rev.total - spending.totalExpenditure;

          // Apply balance to Treasury reserves
          country.treasury += budget.balanceMonthly;

          // NO SILENT REFILLS: deficyt nie "znika" — jest finansowany awaryjną emisją obligacji.
          if (country.treasury <= 0) {
            const shortfall = Math.max(0, -country.treasury);
            const emergencyLoan = Math.max(Math.round(monthlyGdp * 0.5), Math.ceil(shortfall / 1e6) * 1e6);

            if (window.WorldForge.Systems.Debt) {
              window.WorldForge.Systems.Debt.issueBonds(
                country, emergencyLoan, 60, country.currency,
                countryId === state.playerCountryId ? 'Awaryjne Pokrycie Deficytu' : 'Deficit Coverage',
                turnNumber
              );
            } else {
              country.treasury = 0;
            }

            if (countryId === state.playerCountryId) {
              window.WorldForge.Core.GameState.addNotification(
                'danger',
                '🚨 KRYZYS PŁYNNOŚCI SKARBU PAŃSTWA',
                `Rezerwy Skarbu Państwa wyczerpały się! Bank centralny wymusił awaryjną emisję obligacji na ${window.WorldForge.Format.money(emergencyLoan, country.currency)} (dług publiczny rósł będzie dalej). Rozważ cięcia wydatków lub podwyżkę podatków.`,
                countryId
              );
            }
          }

          // Maintain historical buffer
          budget.balanceHistory.push(budget.balanceMonthly);
          if (budget.balanceHistory.length > 36) budget.balanceHistory.shift();

        } catch (err) {
          console.error(`[BudgetSystem] Error executing budget for ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Budget = BudgetSystem;
})();
