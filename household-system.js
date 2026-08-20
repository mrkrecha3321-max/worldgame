/**
 * WorldForge: Nations - Household Simulation System
 * Computes household disposable income, cost of living, savings accumulation,
 * debt service ratio, and consumer happiness in exact base units.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const HouseholdSystem = {
    /**
     * Process monthly household aggregates
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const hh = country.households;
          const eco = country.economy;
          const pop = country.population;
          const taxes = country.taxes;
          const cm = country.creditMarket;

          // Household count
          hh.count = Math.max(50, Math.round(pop.total / 2.6));

          // Disposable Income = Gross Wage * (1 - PIT - Social Contributions)
          const effectiveTaxRate = (taxes.pitRate + (taxes.socialContributionRate * 0.45)) / 100;
          const grossWage = eco.averageMonthlyWage;
          const netWage = grossWage * (1 - effectiveTaxRate);
          hh.disposableIncomeMonthly = V.clampNonNegative(Math.round(netWage));

          // Cost of Living Index
          const monthlyInflationFactor = 1 + (eco.inflation / 1200);
          const housingFactor = 1 + ((cm.housingPriceIndex - 100) / 10000);
          hh.costOfLivingIndex = V.sanitizeNumber(hh.costOfLivingIndex * monthlyInflationFactor * housingFactor, 100, 50, 500);

          // Debt Service Ratio (DSR): % of disposable income spent servicing debt
          const totalDebtServiceMonthly = (cm.mortgage.volume * (cm.mortgage.rate / 1200) + cm.consumer.volume * (cm.consumer.rate / 1200));
          const totalHouseholdIncome = (hh.count * hh.disposableIncomeMonthly);
          hh.debtServiceRatio = V.clampPercent((totalDebtServiceMonthly / Math.max(1, totalHouseholdIncome)) * 100, 12);

          // Savings Accumulation
          const monthlySavingsAmount = Math.round(totalHouseholdIncome * (hh.savingsRate / 100));
          hh.totalSavings = V.clampNonNegative(hh.totalSavings + monthlySavingsAmount);

          // Happiness Index
          const purchasingPower = (hh.disposableIncomeMonthly / Math.max(1, hh.costOfLivingIndex)) * 50;
          const unempSatisfaction = (10 - eco.unemployment) * 3;
          const debtStress = Math.max(0, (hh.debtServiceRatio - 15) * 1.5);
          const healthScore = pop.healthcareQualityIndex * 0.3;

          const rawHappiness = purchasingPower + unempSatisfaction - debtStress + healthScore;
          hh.happinessIndex = V.sanitizeNumber((hh.happinessIndex * 0.88) + (rawHappiness * 0.12), 60, 5, 99);

        } catch (err) {
          console.error(`[HouseholdSystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Household = HouseholdSystem;
})();
