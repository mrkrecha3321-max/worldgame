/**
 * WorldForge: Nations - Commercial Banking System
 * Simulates commercial banks balance sheets, solvency ratios (CAR), liquidity (LCR),
 * non-performing loans (NPL), profitability, bank distress and resolution.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const BankingSystem = {
    /**
     * Process monthly banking operations
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const banks = country.commercialBanks || [];
          const eco = country.economy;
          const cb = country.centralBank;

          for (const bank of banks) {
            // NPL dynamics: increases with higher unemployment & higher interest rates
            const unempStress = Math.max(0, (eco.unemployment - 5.0) * 0.15);
            const rateStress = Math.max(0, (cb.baseRate - 4.0) * 0.10);
            const nplDelta = (unempStress + rateStress - 0.15) * 0.1;
            bank.nplRatio = V.sanitizeNumber(bank.nplRatio + nplDelta, 3.0, 0.5, 35.0);

            // Monthly interest margin revenue: (Loans * (CB Rate + spread) - Deposits * (CB Rate - spread)) / 12
            const lendingRate = (cb.baseRate + 2.5) / 100;
            const depositRate = Math.max(0, (cb.baseRate - 1.5)) / 100;
            const interestIncome = (bank.loans * lendingRate) / 12;
            const interestExpense = (bank.deposits * depositRate) / 12;
            const creditLossProvisions = (bank.loans * (bank.nplRatio / 100) * 0.08) / 12;
            const operationalCost = (bank.assets * 0.012) / 12;

            bank.monthlyProfit = Math.round(interestIncome - interestExpense - creditLossProvisions - operationalCost);

            // Capital Accumulation from retained earnings
            if (bank.monthlyProfit > 0) {
              bank.capital += bank.monthlyProfit * 0.6; // 60% retained
            } else {
              bank.capital += bank.monthlyProfit; // Full absorption of losses
            }

            // Risk-Weighted Assets (RWA) estimation: ~70% of loans + ~20% of gov bonds
            const rwa = (bank.loans * 0.70) + (bank.govBondsHolding * 0.20);
            bank.carSolvencyRatio = V.sanitizeNumber((bank.capital / Math.max(1, rwa)) * 100, 14.0, 1.0, 40.0);

            // Liquidity Coverage Ratio (LCR)
            bank.liquidityCoverageRatio = V.sanitizeNumber(
              ((bank.govBondsHolding + bank.capital * 0.5) / Math.max(1, bank.deposits * 0.15)) * 100,
              120, 30, 300
            );

            // Evaluate Bank Health Status
            if (bank.carSolvencyRatio < 8.0 || bank.nplRatio > 18.0) {
              bank.status = 'Upadłość / Zagrożenie likwidacją';
              if (countryId === state.playerCountryId) {
                window.WorldForge.Core.GameState.addNotification(
                  'danger',
                  'Krytyczny Stan Banku Komercyjnego',
                  `Bank ${bank.name} znalazł się na skraju niewypłacalności (Współczynnik CAR: ${bank.carSolvencyRatio.toFixed(1)}%). Wymaga natychmiastowej interwencji skarbu państwa!`,
                  countryId
                );
              }
            } else if (bank.carSolvencyRatio < 10.5 || bank.nplRatio > 10.0) {
              bank.status = 'Wymaga dokapitalizowania';
            } else if (bank.carSolvencyRatio < 12.5 || bank.nplRatio > 6.0) {
              bank.status = 'Ostrzeżenie';
            } else {
              bank.status = 'Zdrowy';
            }
          }

        } catch (err) {
          console.error(`[BankingSystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Banking = BankingSystem;
})();
