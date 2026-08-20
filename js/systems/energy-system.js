/**
 * WorldForge: Nations - Energy Grid & Power Generation System
 * Simulates total generation capacity (GW), peak load demand, clean energy share,
 * fuel consumption, carbon emissions, and blackout risks.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const EnergySystem = {
    /**
     * Process monthly power grid balance
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const energy = country.energy;
          const pop = country.population;
          const eco = country.economy;

          if (!energy) continue;

          // Peak Demand calculation (GW)
          // Scales with industrial activity and population size
          const industrialLoad = (eco.gdpNominal / 35000);
          const domesticLoad = (pop.total / 1e6 * 0.45);
          energy.peakDemandGW = V.clampNonNegative(Math.round((industrialLoad + domesticLoad) * 10) / 10);

          // Monthly Generation & Consumption (TWh)
          // 1 GW running 720 hours/month = 0.72 TWh
          energy.monthlyGenerationTWh = Math.round(energy.totalCapacityGW * 0.58 * 0.72 * 10) / 10;
          energy.monthlyConsumptionTWh = Math.round(energy.peakDemandGW * 0.65 * 0.72 * 10) / 10;

          // Blackout Risk calculation: surges if capacity is tight compared to peak demand
          const reserveMarginRatio = (energy.totalCapacityGW - energy.peakDemandGW) / Math.max(1, energy.peakDemandGW);
          if (reserveMarginRatio < 0.05) {
            energy.blackoutRisk = V.clampPercent(25.0 + (0.05 - reserveMarginRatio) * 200);
          } else if (reserveMarginRatio < 0.15) {
            energy.blackoutRisk = V.clampPercent(6.0);
          } else {
            energy.blackoutRisk = V.clampPercent(1.2);
          }

          // Compute Clean Energy Share %
          const mix = energy.mix || { coal: 40, gas: 20, nuclear: 0, hydro: 10, wind: 15, solar: 12, storage: 3 };
          const cleanPercent = (mix.nuclear || 0) + (mix.hydro || 0) + (mix.wind || 0) + (mix.solar || 0);
          energy.cleanEnergyShare = V.clampPercent(cleanPercent);

          // Monthly Carbon Emissions estimation (Mt CO2)
          const fossilGenerationGW = energy.totalCapacityGW * (((mix.coal || 0) * 1.0 + (mix.gas || 0) * 0.45) / 100);
          energy.carbonEmissionsMt = Math.round((fossilGenerationGW * 0.6) * 10) / 10;

        } catch (err) {
          console.error(`[EnergySystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Energy = EnergySystem;
})();
