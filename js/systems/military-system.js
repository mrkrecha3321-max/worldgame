/**
 * WorldForge: Nations - Military & National Defense System (Peace-Time)
 * Simulates deterrence posture, branch allocations (Land, Air, Navy, Air Defense, Cyber, Logistics),
 * readiness, modernization pipelines, and equipment maintenance.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const MilitarySystem = {
    /**
     * Process monthly defense readiness and modernization
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const mil = country.military;
          const budget = country.budget;
          const eco = country.economy;
          if (!mil) continue;

          // Maintenance budget derived from national defense spending share
          const defenseShare = budget.spending?.defense || 8.0;
          const monthlyMilBudget = (eco.gdpNominal / 12) * 0.33 * (defenseShare / 100);
          mil.monthlyMaintenanceCost = Math.round(monthlyMilBudget);

          // Readiness dynamics: higher budget maintains peak readiness
          const budgetSufficiency = monthlyMilBudget / Math.max(1, mil.totalPersonnel * 0.0035);
          if (budgetSufficiency >= 1.0) {
            mil.readiness = V.clampPercent(mil.readiness + 0.5);
            mil.morale = V.clampPercent(mil.morale + 0.3);
          } else {
            mil.readiness = V.clampPercent(mil.readiness - 0.8);
            mil.morale = V.clampPercent(mil.morale - 0.5);
          }

          // Modernization Level gradually rises with R&D and defense procurement
          const techBonus = country.research?.unlockedTechs.filter(t => t.startsWith('tech_hypersonic') || t.startsWith('tech_laser') || t.startsWith('tech_autonomous_swarm')).length * 5;
          mil.modernizationLevel = V.clampPercent(mil.modernizationLevel + 0.1 + techBonus * 0.05);

          // Compute Overall Deterrence Score (0 - 100)
          const sizeFactor = Math.min(30, (mil.totalPersonnel / 100000) * 4);
          const qualFactor = (mil.modernizationLevel * 0.35);
          const readyFactor = (mil.readiness * 0.35);
          mil.deterrenceScore = V.clampPercent(Math.round(sizeFactor + qualFactor + readyFactor));

        } catch (err) {
          console.error(`[MilitarySystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Military = MilitarySystem;
})();
