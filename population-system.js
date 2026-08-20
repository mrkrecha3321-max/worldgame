/**
 * WorldForge: Nations - Demographics & Population Simulation System
 * Computes age cohorts, birth/death rates, workforce participation, education,
 * healthcare outcomes, and migration flows.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const PopulationSystem = {
    /**
     * Process monthly demographic changes
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const pop = country.population;
          const budget = country.budget;
          const eco = country.economy;

          // 1. Monthly Births & Deaths
          // Annual birth rate per 1000 population: (pop.birthRate * 7.5)
          const monthlyBirths = Math.round((pop.total * (pop.birthRate * 7.5) / 1000) / 12);
          const monthlyDeaths = Math.round((pop.total * (pop.mortalityRate / 1000)) / 12);

          // 2. Net Migration
          // Countries with higher wages and lower unemployment attract migrants
          const wageAttractiveness = (eco.averageMonthlyWage - 2000) * 0.05;
          const stabilityFactor = (eco.politicalStability - 60) * 2;
          const monthlyMigration = Math.round(pop.netMigrationMonthly + (wageAttractiveness + stabilityFactor));

          // 3. Population Update
          const oldTotal = pop.total;
          pop.total = V.clampNonNegative(oldTotal + monthlyBirths - monthlyDeaths + monthlyMigration, 1000);

          // 4. Workforce calculation
          const workingAgePopulation = pop.total * (pop.workingAgeShare / 100);
          const participationRate = 0.74; // ~74% participation
          pop.workforceTotal = V.clampNonNegative(Math.round(workingAgePopulation * participationRate));

          // 5. Healthcare & Education Quality (Driven by public spending with delay)
          const healthBudgetShare = budget.spending?.health || 15;
          const targetHealthIndex = Math.min(98, 60 + (healthBudgetShare * 1.8));
          pop.healthcareQualityIndex = V.sanitizeNumber((pop.healthcareQualityIndex * 0.98) + (targetHealthIndex * 0.02), 75, 20, 99);

          const eduBudgetShare = budget.spending?.education || 12;
          const targetEduIndex = Math.min(98, 55 + (eduBudgetShare * 2.2));
          pop.educationQualityIndex = V.sanitizeNumber((pop.educationQualityIndex * 0.98) + (targetEduIndex * 0.02), 75, 20, 99);

          // Life Expectancy linked to Healthcare Quality
          pop.lifeExpectancy = V.sanitizeNumber(70 + (pop.healthcareQualityIndex * 0.15), 78, 50, 92);

          // Track population history
          pop.history.push(pop.total);
          if (pop.history.length > 36) pop.history.shift();

        } catch (err) {
          console.error(`[PopulationSystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Population = PopulationSystem;
})();
