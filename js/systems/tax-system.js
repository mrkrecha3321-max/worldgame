/**
 * WorldForge: Nations - Tax Simulation System
 * Realistically calibrated revenue collections: VAT, PIT, CIT, Excise, Social Contributions, Tariffs.
 * Total government revenue tracks realistic ~34%-42% of GDP adjusted for tax rates and collection efficiency.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const TaxSystem = {
    /**
     * Process monthly tax collections
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const taxes = country.taxes;
          const eco = country.economy;
          const pop = country.population;
          const rev = country.budget.revenues;

          const monthlyGdp = eco.gdpNominal / 12;
          const efficiencyRatio = (taxes.efficiency / 100);
          const legalEconomyRatio = 1 - (taxes.greyEconomyShare / 100);

          // 1. VAT (Value Added Tax) ~ 12% of GDP baseline
          const vatBase = monthlyGdp * 0.55; // Consumption share of GDP
          const vatElasticity = Math.max(0.7, 1 - Math.max(0, taxes.vatRate - 23) * 0.02);
          rev.vat = V.clampNonNegative(Math.round(vatBase * (taxes.vatRate / 100) * efficiencyRatio * vatElasticity * legalEconomyRatio));

          // 2. PIT (Personal Income Tax) ~ 6.5% of GDP baseline
          const wageBillBase = monthlyGdp * 0.40; // Wage share of GDP
          const pitElasticity = Math.max(0.7, 1 - Math.max(0, taxes.pitRate - 18) * 0.02);
          rev.pit = V.clampNonNegative(Math.round(wageBillBase * (taxes.pitRate / 100) * efficiencyRatio * pitElasticity * legalEconomyRatio));

          // 3. CIT (Corporate Income Tax) ~ 3.2% of GDP baseline
          const corporateProfitBase = monthlyGdp * 0.16;
          const citElasticity = Math.max(0.6, 1 - Math.max(0, taxes.citRate - 19) * 0.025);
          rev.cit = V.clampNonNegative(Math.round(corporateProfitBase * (taxes.citRate / 100) * efficiencyRatio * citElasticity));

          // 4. Excise Duties ~ 2.2% of GDP baseline
          rev.excise = V.clampNonNegative(Math.round(monthlyGdp * 0.022 * (taxes.exciseRate / 15) * efficiencyRatio));

          // 5. Social Security Contributions ~ 10.5% of GDP baseline
          rev.socialContributions = V.clampNonNegative(Math.round(wageBillBase * (taxes.socialContributionRate / 100) * efficiencyRatio * 0.95));

          // 6. Property & Wealth Taxes ~ 1.0% of GDP baseline
          rev.propertyTax = V.clampNonNegative(Math.round(monthlyGdp * 0.010 * (taxes.propertyTaxRate / 1.0) * efficiencyRatio));

          // 7. Tariffs & Customs Duties
          let totalImportVolumeUsd = 0;
          if (country.production) {
            for (const [resId, item] of Object.entries(country.production)) {
              const resMeta = window.WorldForge.Data.Resources.find(r => r.id === resId);
              const price = state.globalMarket?.prices[resId] || (resMeta ? resMeta.basePrice : 100);
              totalImportVolumeUsd += (item.importVolume * price);
            }
          }
          rev.tariffs = V.clampNonNegative(Math.round(totalImportVolumeUsd * (taxes.importTariffRate / 100) * efficiencyRatio));

          // 8. Resource Royalties & Extraction Fees
          let resourceRoyalty = 0;
          if (country.production) {
            for (const key of ['oil', 'gas', 'coal']) {
              const p = country.production[key];
              if (p && p.output > 0) {
                const resMeta = window.WorldForge.Data.Resources.find(r => r.id === key);
                const price = state.globalMarket?.prices[key] || (resMeta ? resMeta.basePrice : 80);
                resourceRoyalty += Math.round(p.output * price * 0.05);
              }
            }
          }
          rev.resourceRoyalties = V.clampNonNegative(resourceRoyalty);

          // 9. State-Owned Enterprise (SOE) Dividends
          rev.soeDividends = V.clampNonNegative(Math.round(monthlyGdp * 0.005));

          // 10. Miscellaneous Fees & Administrative Revenue
          rev.other = V.clampNonNegative(Math.round(monthlyGdp * 0.004));

          // Total Monthly Public Revenue
          rev.total = rev.vat + rev.pit + rev.cit + rev.excise + rev.socialContributions +
                      rev.propertyTax + rev.tariffs + rev.resourceRoyalties + rev.soeDividends + rev.other;

          // Grey economy natural dynamics
          const totalTaxPressure = (taxes.vatRate + taxes.pitRate + taxes.citRate) / 3;
          if (totalTaxPressure > 25) {
            taxes.greyEconomyShare = Math.min(30, taxes.greyEconomyShare + 0.02);
          } else if (totalTaxPressure < 18) {
            taxes.greyEconomyShare = Math.max(4, taxes.greyEconomyShare - 0.03);
          }

        } catch (err) {
          console.error(`[TaxSystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Tax = TaxSystem;
})();
