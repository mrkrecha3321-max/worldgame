/**
 * WorldForge: Nations - Central Bank & Monetary Policy System
 * Manages policy interest rates, reserve ratios, money supply M2, foreign reserves,
 * open market operations, and currency union constraints.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const CentralBankSystem = {
    /**
     * Monthly monetary policy settlement
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const cb = country.centralBank;
          const eco = country.economy;

          // If country belongs to currency union (e.g. EUR) and is not union leader, sync with leader
          if (country.monetaryUnion && !country.isUnionLeader) {
            const leaderId = Object.keys(state.countries).find(c => state.countries[c].monetaryUnion === country.monetaryUnion && state.countries[c].isUnionLeader);
            if (leaderId && state.countries[leaderId]) {
              cb.baseRate = state.countries[leaderId].centralBank.baseRate;
              cb.reserveRequirement = state.countries[leaderId].centralBank.reserveRequirement;
            }
          }

          // Taylor Rule Guide calculation
          const neutralRate = 2.5;
          const inflationGap = eco.inflation - cb.inflationTarget;
          const outputGap = eco.gdpGrowthYoY - 2.5;
          const taylorRate = neutralRate + (0.5 * inflationGap) + (0.5 * outputGap);

          // For Bot countries (not player), smoothly adjust base rate towards Taylor rule
          if (countryId !== state.playerCountryId && (!country.monetaryUnion || country.isUnionLeader)) {
            const targetRate = V.sanitizeNumber(taylorRate, 3.0, window.WorldForge.CONFIG.MIN_INTEREST_RATE, window.WorldForge.CONFIG.MAX_INTEREST_RATE);
            cb.baseRate = V.sanitizeNumber((cb.baseRate * 0.85) + (targetRate * 0.15), 3.0, 0, 45);
          }

          // M2 Money Supply Growth
          // Lower interest rates and credit expansion increase M2; Quantitative Tightening decreases M2
          const m2GrowthRate = (4.0 - (cb.baseRate * 0.5)) / 1200;
          cb.m2MoneySupply = V.clampNonNegative(cb.m2MoneySupply * (1 + m2GrowthRate));

          // Foreign Reserves yield small passive return (e.g. 2.5% annual on US Treasuries)
          const fxYieldMonthly = (cb.foreignReserves * 0.025) / 12;
          cb.foreignReserves += fxYieldMonthly;

        } catch (err) {
          console.error(`[CentralBankSystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.CentralBank = CentralBankSystem;
})();
