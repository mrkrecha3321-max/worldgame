/**
 * WorldForge: Nations - Infrastructure Simulation System
 * Manages road networks, rail, high-speed rail corridors, seaports, airports,
 * digital broadband coverage, and public housing stock.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const InfrastructureSystem = {
    /**
     * Process monthly infrastructure upgrades & maintenance
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const infra = country.infrastructure;
          const budget = country.budget;
          const eco = country.economy;

          if (!infra) continue;

          // Maintenance & Natural wear-and-tear
          const infraSpendShare = budget.spending?.infrastructure || 8;
          // Threshold of 7% share needed to prevent deterioration
          const delta = (infraSpendShare - 7.0) * 0.05;

          infra.roadQuality = V.clampPercent(infra.roadQuality + delta);
          infra.railQuality = V.clampPercent(infra.railQuality + delta);
          infra.seaportsCapacity = V.clampPercent(infra.seaportsCapacity + delta * 0.8);
          infra.airportsCapacity = V.clampPercent(infra.airportsCapacity + delta * 0.8);
          infra.digitalBroadband5GCoverage = V.clampPercent(infra.digitalBroadband5GCoverage + 0.1);
          infra.powerGridReliability = V.clampPercent(infra.powerGridReliability + delta * 0.5);

          // Productivity index boost from modern infrastructure
          const avgInfraScore = (infra.roadQuality + infra.railQuality + infra.digitalBroadband5GCoverage + infra.powerGridReliability) / 4;
          eco.productivityIndex = V.sanitizeNumber(80 + (avgInfraScore * 0.35), 100, 40, 200);

        } catch (err) {
          console.error(`[InfrastructureSystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Infrastructure = InfrastructureSystem;
})();
