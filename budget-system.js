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

          // Benchmark baseline monthly government primary expenditure: ~28% of monthly GDP
          const monthlyGdp = eco.gdpNominal / 12;
          const baselinePublicSpendingMonthly = monthlyGdp * 0.28;

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

          // NO SILENT REFILLS: If Treasury hits <= 0, clamp to 0 and trigger Emergency Liquidity Crisis
          if (country.treasury <= 0) {
            country.treasury = 0;

            if (countryId === state.playerCountryId) {
              window.WorldForge.Core.GameState.addNotification(
                'danger',
                '🚨 KRYZYS PŁYNNOŚCI SKARBU PAŃSTWA',
                'Rezerwy Skarbu Państwa spadły do zera! Wymagana natychmiastowa pożyczka ratunkowa lub cięcia wydatków.',
                countryId
              );
            } else {
              // Bot issues emergency deficit bond if needed
              if (window.WorldForge.Systems.Debt) {
                window.WorldForge.Systems.Debt.issueBonds(country, Math.round(monthlyGdp * 0.5), 60, country.currency, 'Deficit Coverage', turnNumber);
              }
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
