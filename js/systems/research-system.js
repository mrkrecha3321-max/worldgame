/**
 * WorldForge: Nations - Research & Technology Simulation System
 * Manages scientific discovery pipelines, tech trees, prerequisite verification,
 * and dynamic systemic modifier applications upon technology completion.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const ResearchSystem = {
    /**
     * Start researching a specific technology node
     */
    startTech(country, techId) {
      const techList = window.WorldForge.Data.Technologies || [];
      const tech = techList.find(t => t.id === techId);
      if (!tech) return { success: false, reason: 'Nie odnaleziono podanej technologii' };

      if (!country.research.unlockedTechs) country.research.unlockedTechs = [];
      if (country.research.unlockedTechs.includes(techId)) {
        return { success: false, reason: 'Technologia została już opracowana' };
      }

      // Check prerequisites
      if (tech.prerequisites && tech.prerequisites.length > 0) {
        for (const prereqId of tech.prerequisites) {
          if (!country.research.unlockedTechs.includes(prereqId)) {
            const prereqTech = techList.find(t => t.id === prereqId);
            return {
              success: false,
              reason: `Wymagane wcześniejsze odblokowanie technologii: "${prereqTech ? prereqTech.name : prereqId}"`
            };
          }
        }
      }

      country.research.activeTechId = techId;
      country.research.activeTechProgress = 0;

      window.WorldForge.Core.GameState.addNotification(
        'info',
        'Rozpoczęto Projekt Badawczy',
        `Rozpoczęto badania nad: "${tech.name}". Szacowany czas realizacji: ${tech.estimatedMonths} miesięcy.`,
        country.id
      );

      return { success: true, data: { techId, name: tech.name, cost: tech.costPoints } };
    },

    /**
     * Monthly scientific discovery loop
     */
    processMonthly(state, turnNumber) {
      const techList = window.WorldForge.Data.Technologies || [];

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const res = country.research;
          const budget = country.budget;
          const eco = country.economy;
          if (!res) continue;

          // Points generation: based on R&D spending share + education quality + GDP size
          const rAndDShare = budget.spending?.research || 4.0;
          const eduIndex = country.population?.educationQualityIndex || 75;
          const basePoints = (eco.gdpNominal * 0.0006) * (rAndDShare / 4.0) * (eduIndex / 75);
          res.monthlyPoints = Math.max(50, Math.round(basePoints));

          // Advance active research
          if (res.activeTechId) {
            const tech = techList.find(t => t.id === res.activeTechId);
            if (tech) {
              res.activeTechProgress += res.monthlyPoints;

              // Check if completed
              if (res.activeTechProgress >= tech.costPoints) {
                if (!res.unlockedTechs.includes(tech.id)) {
                  res.unlockedTechs.push(tech.id);
                  this.applyTechEffects(country, tech);

                  if (countryId === state.playerCountryId) {
                    window.WorldForge.Core.GameState.addNotification(
                      'success',
                      'Przełom Naukowy Zakończony!',
                      `Opracowano nową technologię: "${tech.name}" (${tech.branchName})! Efekty systemowe weszły w życie.`,
                      countryId
                    );
                  }
                }
                res.activeTechId = null;
                res.activeTechProgress = 0;
              }
            } else {
              res.activeTechId = null;
            }
          }

        } catch (err) {
          console.error(`[ResearchSystem] Error processing ${countryId}:`, err);
        }
      }
    },

    applyTechEffects(country, tech) {
      const eff = tech.effects || {};
      if (eff.taxEfficiency) country.taxes.efficiency = Math.min(99, country.taxes.efficiency + eff.taxEfficiency);
      if (eff.greyEconomyReduction) country.taxes.greyEconomyShare = Math.max(2, country.taxes.greyEconomyShare + eff.greyEconomyReduction);
      if (eff.productivityIndex) country.economy.productivityIndex += eff.productivityIndex;
      if (eff.deterrenceScore) country.military.deterrenceScore = Math.min(100, country.military.deterrenceScore + eff.deterrenceScore);
      if (eff.cleanEnergyShare) country.energy.cleanEnergyShare = Math.min(100, country.energy.cleanEnergyShare + eff.cleanEnergyShare);
    }
  };

  window.WorldForge.Systems.Research = ResearchSystem;
})();
