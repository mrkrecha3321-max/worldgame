/**
 * WorldForge: Nations - Credit Market Simulation System
 * Models mortgage, consumer, corporate, investment, interbank, and foreign lending,
 * interest rate spreads, delinquency, and housing asset bubble risk.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const CreditSystem = {
    /**
     * Monthly credit settlement loop
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const cm = country.creditMarket;
          const cb = country.centralBank;
          const eco = country.economy;
          const baseRate = cb.baseRate;

          // Define segment spreads over Central Bank base rate
          const spreads = {
            mortgage: 2.25,
            consumer: 5.50,
            corporate: 3.10,
            investment: 2.80,
            interbank: 0.50,
            foreign: 2.00
          };

          let totalNewCreditVolume = 0;

          for (const [segmentKey, spread] of Object.entries(spreads)) {
            const segment = cm[segmentKey];
            if (!segment) continue;

            // Update effective lending rate
            segment.rate = V.sanitizeNumber(baseRate + spread, 5.0, 0.5, 45.0);

            // Credit demand is inversely related to rate and positively to GDP growth
            const demandFactor = Math.max(0.2, 1 - (segment.rate - 4.0) * 0.08 + (eco.gdpGrowthYoY - 2.0) * 0.05);
            const baseOrigination = (segment.volume * 0.012) * demandFactor;
            segment.monthlyNew = V.clampNonNegative(Math.round(baseOrigination));

            // Monthly principal repayment (~1% of total volume)
            const monthlyRepayments = segment.volume * 0.009;

            // Volume evolution
            segment.volume = V.clampNonNegative(Math.round(segment.volume + segment.monthlyNew - monthlyRepayments));
            totalNewCreditVolume += segment.monthlyNew;

            // Delinquency (NPL) adjustment
            const unempFactor = (eco.unemployment - 4.5) * 0.2;
            const rateBurden = (segment.rate - 5.0) * 0.15;
            segment.npl = V.sanitizeNumber(segment.npl + (unempFactor + rateBurden - 0.05) * 0.05, 2.5, 0.1, 30.0);
          }

          // Housing Price Index (HPI) & Bubble Risk
          // Rapid mortgage volume expansion faster than wage growth inflates HPI
          const mortgageGrowthRate = (cm.mortgage.monthlyNew / Math.max(1, cm.mortgage.volume)) * 12 * 100;
          const wageGrowthRate = 3.0 + (eco.inflation * 0.8);
          const hpiDelta = (mortgageGrowthRate - wageGrowthRate) * 0.15;
          cm.housingPriceIndex = V.sanitizeNumber(cm.housingPriceIndex * (1 + hpiDelta / 1200), 100, 40, 400);

          // Bubble risk score (0 - 100)
          const bubbleRatio = (cm.housingPriceIndex - 100) * 0.6 + (cm.mortgage.volume / Math.max(1, eco.gdpNominal) * 100 - 30) * 0.8;
          cm.bubbleRiskScore = V.clampPercent(bubbleRatio, 15);

        } catch (err) {
          console.error(`[CreditSystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Credit = CreditSystem;
})();
