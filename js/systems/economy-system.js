/**
 * WorldForge: Nations - Economy Simulation System
 * Rigorous macroeconomic model: compounding monthly growth rate, separation of GDP from Treasury,
 * 5% monthly swing safety limiter and detailed diagnostic tracking.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const EconomySystem = {
    /**
     * Process monthly macroeconomic growth and indicators
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;
      const R = window.WorldForge.Core.Random;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const eco = country.economy;
          const pop = country.population;
          const biz = country.businesses;
          const hh = country.households;
          const budget = country.budget;
          const cb = country.centralBank;
          const debt = country.debt;
          const taxes = country.taxes;

          const oldGdpNominal = eco.gdpNominal;
          const oldGdpReal = eco.gdpReal || oldGdpNominal;
          const treasuryBefore = country.treasury;
          const debtBefore = debt.totalDebt;

          // 1. Compute Macroeconomic Drivers for Annual Growth Rate
          const basePotentialGrowth = (country.region === 'Europa' || country.region === 'Ameryka Północna') ? 2.4 : 4.5;
          
          // (a) Household Consumption & Consumer Confidence Impact (-0.5% to +0.8%)
          const consumerConfidenceScore = hh.happinessIndex || 60;
          const consumptionImpact = (consumerConfidenceScore - 55) * 0.03;

          // (b) Corporate Investment Capex & Profitability Impact (-0.8% to +1.0%)
          const corpProfitFactor = (biz.averageProfitMargin - 7.5) * 0.12;
          const borrowingCostPenalty = Math.max(0, (country.creditMarket.corporate.rate - 5.0) * 0.15);
          const investmentImpact = corpProfitFactor - borrowingCostPenalty;

          // (c) Fiscal & Infrastructure Impulse (-0.6% to +0.8%)
          const infraShare = budget.spending.infrastructure || 8.0;
          const rAndDShare = budget.spending.research || 4.0;
          const publicInvestmentBoost = ((infraShare + rAndDShare) - 12.0) * 0.04;
          const taxFrictionPenalty = Math.max(0, ((taxes.vatRate + taxes.pitRate + taxes.citRate) / 3 - 22.0) * 0.05);
          const govFiscalImpact = publicInvestmentBoost - taxFrictionPenalty;

          // (d) Net Trade Impact
          let monthlyExportValue = 0;
          let monthlyImportValue = 0;
          if (country.production) {
            for (const [resId, item] of Object.entries(country.production)) {
              const resMeta = window.WorldForge.Data.Resources.find(r => r.id === resId);
              const price = state.globalMarket?.prices[resId] || (resMeta ? resMeta.basePrice : 100);
              monthlyExportValue += (item.exportVolume * price * 1000);
              monthlyImportValue += (item.importVolume * price * 1000);
            }
          }
          const netExportMonthly = monthlyExportValue - monthlyImportValue;
          const tradeGdpRatio = netExportMonthly / Math.max(1, oldGdpNominal / 12);
          const tradeImpact = V.sanitizeNumber(tradeGdpRatio * 1.5, 0, -1.5, 2.0);

          // (e) Energy Security & Stability Bottlenecks
          const blackoutPenalty = (country.energy?.blackoutRisk > 5) ? -0.4 : 0.0;

          // Sum annual growth rate (%)
          const randomDrift = R.gaussian(0, 0.05);
          let netAnnualGrowthRate = basePotentialGrowth + consumptionImpact + investmentImpact + govFiscalImpact + tradeImpact + blackoutPenalty + randomDrift;
          netAnnualGrowthRate = V.sanitizeNumber(netAnnualGrowthRate, 2.5, -12.0, 18.0);

          // 2. Compounding Monthly Rate Formula: (1 + r)^(1/12) - 1
          const monthlyGrowthRate = Math.pow(1 + netAnnualGrowthRate / 100, 1 / 12) - 1;

          // Calculate New Real GDP
          let newGdpReal = oldGdpReal * (1 + monthlyGrowthRate);

          // 3. Strict Safety Guard: Limit monthly change between -5% and +5%
          const minAllowedGdp = oldGdpReal * (1 + window.WorldForge.CONFIG.MAX_MONTHLY_GDP_DROP_LIMIT);
          const maxAllowedGdp = oldGdpReal * (1 + window.WorldForge.CONFIG.MAX_MONTHLY_GDP_GROWTH_LIMIT);
          newGdpReal = Math.max(minAllowedGdp, Math.min(maxAllowedGdp, newGdpReal));

          eco.gdpReal = Math.round(newGdpReal);

          // 4. Inflation Adjustment — kotwica inflacyjna indywidualna dla każdego państwa
          // (kraje rozwijające się i niestabilne utrzymują wyższą inflację strukturalną,
          // zamiast zbiegać wszystkie do jednej globalnej wartości ~2.2%)
          const inflationAnchor = V.sanitizeNumber(
            eco.inflationAnchor || Math.min(40, Math.max(1.5, eco.inflation)),
            3.0, 1.0, 40.0
          );
          const interestDampening = (cb.baseRate - 2.5) * 0.35;
          const outputGap = (netAnnualGrowthRate - basePotentialGrowth) * 0.20;

          // Presja fiskalna: trwały deficyt powyżej 4% PKB rocznie rozgrzewa inflację
          const fiscalDeficitRatio = -budget.balanceMonthly * 12 / Math.max(1, eco.gdpNominal);
          const fiscalPressure = Math.max(0, fiscalDeficitRatio - 0.04) * 55; // pp rocznie

          const newInflation = eco.inflation
            + (inflationAnchor + outputGap + fiscalPressure - interestDampening - eco.inflation) * 0.10
            + R.gaussian(0, 0.08);
          eco.inflation = V.sanitizeNumber(newInflation, 3.0, -1.0, 85.0);

          // Nominal GDP is Real GDP adjusted for inflation index
          eco.gdpNominal = Math.round(eco.gdpReal * (1 + eco.inflation / 100));
          eco.gdpPerCapita = Math.round(eco.gdpNominal / Math.max(1, pop.total));
          eco.gdpGrowthYoY = netAnnualGrowthRate;

          // 5. Unemployment (Okun's Law linkage)
          const growthDelta = netAnnualGrowthRate - basePotentialGrowth;
          let newUnemployment = eco.unemployment - (growthDelta * 0.25 * 0.1) + R.gaussian(0, 0.04);
          eco.unemployment = V.sanitizeNumber(newUnemployment, 5.0, 1.2, 38.0);

          // 6. Wages Adjustment
          const productivityFactor = (eco.productivityIndex / 100);
          const inflationAdjustment = 1 + (eco.inflation / 1200);
          const unempWageDampener = Math.max(0.85, 1 - (eco.unemployment - 4.5) * 0.02);
          eco.averageMonthlyWage = Math.round(eco.averageMonthlyWage * inflationAdjustment * unempWageDampener * (0.99 + productivityFactor * 0.01));

          // 7. Currency Exchange Rate Adjustment (vs USD)
          if (country.currency !== 'USD' && !country.monetaryUnion) {
            const interestDiff = cb.baseRate - (state.countries['USA']?.centralBank?.baseRate || 4.5);
            const tradeRatio = netExportMonthly / Math.max(1, monthlyExportValue + monthlyImportValue + 1);
            const debtPenalty = Math.max(0, (debt.debtToGdp - 60) * 0.001);
            const fxDelta = (-interestDiff * 0.003) - (tradeRatio * 0.008) + debtPenalty + R.gaussian(0, 0.002);
            country.currencyExchangeRate = V.sanitizeNumber(country.currencyExchangeRate * (1 + fxDelta), 1.0, 0.0001, 100000);
          }

          // 8. Social Approval & Political Stability
          const purchasingPowerTrend = (eco.averageMonthlyWage / Math.max(1, hh.costOfLivingIndex)) * 0.1;
          const unempPenalty = (eco.unemployment - 4.5) * 1.5;
          const inflationPenalty = Math.max(0, eco.inflation - 3.0) * 1.8;
          const taxBurden = ((taxes.vatRate + taxes.pitRate) / 2 - 20) * 0.4;
          const healthFactor = (pop.healthcareQualityIndex - 70) * 0.2;

          let targetApproval = 52 + purchasingPowerTrend - unempPenalty - inflationPenalty - taxBurden + healthFactor;
          eco.socialApproval = V.sanitizeNumber((eco.socialApproval * 0.88) + (targetApproval * 0.12), 52, 5, 98);
          eco.politicalStability = V.sanitizeNumber((eco.politicalStability * 0.92) + ((eco.socialApproval + 25) * 0.08), 70, 10, 99);

          // 9. Store Detailed Diagnostics for ?debug=1 report
          eco.lastRoundDiagnostics = {
            turn: turnNumber,
            gdpBefore: oldGdpNominal,
            gdpAfter: eco.gdpNominal,
            gdpRealBefore: oldGdpReal,
            gdpRealAfter: eco.gdpReal,
            baseAnnualGrowth: basePotentialGrowth,
            consumptionImpact: Math.round(consumptionImpact * 100) / 100,
            investmentImpact: Math.round(investmentImpact * 100) / 100,
            govFiscalImpact: Math.round(govFiscalImpact * 100) / 100,
            tradeImpact: Math.round(tradeImpact * 100) / 100,
            blackoutPenalty: Math.round(blackoutPenalty * 100) / 100,
            netAnnualRate: Math.round(netAnnualGrowthRate * 100) / 100,
            monthlyRate: Math.round(monthlyGrowthRate * 10000) / 100,
            monthlyRevenue: budget.revenues.total,
            monthlyExpenses: budget.spending.totalExpenditure,
            balance: budget.balanceMonthly,
            treasuryBefore: treasuryBefore,
            treasuryAfter: country.treasury,
            debtBefore: debtBefore,
            debtAfter: debt.totalDebt
          };

          // Update histories
          eco.gdpHistory.push(eco.gdpNominal);
          if (eco.gdpHistory.length > 60) eco.gdpHistory.shift();
          eco.inflationHistory.push(eco.inflation);
          if (eco.inflationHistory.length > 60) eco.inflationHistory.shift();
          eco.unemploymentHistory.push(eco.unemployment);
          if (eco.unemploymentHistory.length > 60) eco.unemploymentHistory.shift();

        } catch (err) {
          console.error(`[EconomySystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Economy = EconomySystem;
})();
