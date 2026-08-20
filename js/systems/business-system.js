/**
 * WorldForge: Nations - Business & Enterprise Simulation System
 * Computes corporate revenues, costs, capacity utilization, hiring/layoffs,
 * business capex, and bankruptcy rates in exact base units.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const BusinessSystem = {
    /**
     * Process monthly corporate aggregates
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const biz = country.businesses;
          const eco = country.economy;
          const taxes = country.taxes;
          const cm = country.creditMarket;

          // Capacity utilization
          const demandFactor = (eco.gdpGrowthYoY - 2.0) * 1.5;
          biz.capacityUtilization = V.sanitizeNumber(78.0 + demandFactor, 78.0, 45.0, 99.0);

          // Profit margins
          const interestBurden = (cm.corporate.rate - 5.0) * 0.4;
          const taxBurden = (taxes.citRate - 19.0) * 0.25;
          biz.averageProfitMargin = V.sanitizeNumber(8.5 - interestBurden - taxBurden + (biz.capacityUtilization - 75) * 0.1, 8.0, 1.0, 25.0);

          // Corporate Capex (Capital Expenditure)
          const capexPropensity = (biz.averageProfitMargin / 100) * 1.8;
          biz.corporateCapex = V.clampNonNegative(Math.round(eco.gdpNominal * capexPropensity));

          // Monthly Bankruptcies
          const baseBankruptcies = Math.round(country.population.total / 120000);
          const stressMultiplier = Math.max(0.5, 1 + (cm.corporate.rate - 6) * 0.15 - (biz.averageProfitMargin - 6) * 0.1);
          biz.monthlyBankruptcies = Math.max(1, Math.round(baseBankruptcies * stressMultiplier));

          // Hiring vs Layoff rates
          if (eco.gdpGrowthYoY > 2.5) {
            biz.hiringRate = V.sanitizeNumber(2.4 + (eco.gdpGrowthYoY - 2.5) * 0.3, 2.0, 0.5, 8.0);
            biz.layoffRate = V.sanitizeNumber(1.4 - (eco.gdpGrowthYoY - 2.5) * 0.2, 1.2, 0.2, 5.0);
          } else {
            biz.hiringRate = V.sanitizeNumber(1.5, 1.5, 0.5, 5.0);
            biz.layoffRate = V.sanitizeNumber(2.2 + (2.5 - eco.gdpGrowthYoY) * 0.4, 2.0, 0.5, 10.0);
          }

        } catch (err) {
          console.error(`[BusinessSystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Business = BusinessSystem;
})();
