/**
 * WorldForge: Nations - Megaprojects Simulation System
 * Manages construction pipelines, resource requisitions, engineering progress,
 * and commissioning bonuses upon project delivery.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const ProjectSystem = {
    /**
     * Start a new megaproject
     */
    startProject(country, projectId, turn = 1) {
      const projectsCatalog = window.WorldForge.Data.Projects || [];
      const projMeta = projectsCatalog.find(p => p.id === projectId);
      if (!projMeta) return { success: false, reason: 'Nie odnaleziono wskazanego projektu' };

      if (!country.projects) country.projects = { active: [], completed: [] };

      // Check if already active or completed
      if (country.projects.active.some(p => p.id === projectId)) {
        return { success: false, reason: 'Ten projekt jest już w trakcie realizacji' };
      }
      if (country.projects.completed.some(p => p.id === projectId)) {
        return { success: false, reason: 'Ten projekt został już ukończony' };
      }

      // Check initial mobilization funding (10% of total cost)
      const mobilizationCost = projMeta.totalCost * 0.1;
      if (country.treasury < mobilizationCost) {
        return {
          success: false,
          reason: `Niewystarczające środki na wkład początkowy (wymagane ${window.WorldForge.Core.NumberFormat.formatMoney(mobilizationCost)})`
        };
      }

      country.treasury -= mobilizationCost;

      const activeProject = {
        id: projMeta.id,
        name: projMeta.name,
        category: projMeta.category,
        totalCost: projMeta.totalCost,
        monthlyCost: projMeta.monthlyCost,
        durationMonths: projMeta.durationMonths,
        remainingMonths: projMeta.durationMonths,
        progressPercent: 0,
        startTurn: turn,
        effects: projMeta.effects
      };

      country.projects.active.push(activeProject);

      window.WorldForge.Core.GameState.addNotification(
        'info',
        'Rozpoczęto Megaprojekt Państwowy',
        `Rozpoczęto budowę: "${projMeta.name}". Planowany czas inwestycji: ${projMeta.durationMonths} miesięcy.`,
        country.id
      );

      return { success: true, data: activeProject };
    },

    /**
     * Cancel an active megaproject
     */
    cancelProject(country, projectId) {
      if (!country.projects || !country.projects.active) return { success: false, reason: 'Brak aktywnych projektów' };
      const idx = country.projects.active.findIndex(p => p.id === projectId);
      if (idx === -1) return { success: false, reason: 'Projekt nie znajduje się na liście aktywnych' };

      const removed = country.projects.active.splice(idx, 1)[0];
      return { success: true, data: removed };
    },

    /**
     * Monthly project progression loop
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const projs = country.projects;
          if (!projs || !projs.active) continue;

          for (let i = projs.active.length - 1; i >= 0; i--) {
            const p = projs.active[i];

            // Deduct monthly operational investment from Treasury
            if (country.treasury >= p.monthlyCost) {
              country.treasury -= p.monthlyCost;
              p.remainingMonths -= 1;
              const elapsed = p.durationMonths - p.remainingMonths;
              p.progressPercent = V.clampPercent((elapsed / p.durationMonths) * 100);
            } else {
              // Cash shortage halts progress this month
              if (countryId === state.playerCountryId) {
                window.WorldForge.Core.GameState.addNotification(
                  'warning',
                  'Wstrzymanie Prac Budowlanych',
                  `Brak środków w skarbie państwa na sfinansowanie bieżącego etapu projektu "${p.name}".`,
                  countryId
                );
              }
            }

            // Check completion
            if (p.remainingMonths <= 0) {
              projs.active.splice(i, 1);
              projs.completed.push({
                id: p.id,
                name: p.name,
                completedTurn: turnNumber,
                effects: p.effects
              });

              this.applyCompletionBonuses(country, p);

              if (countryId === state.playerCountryId) {
                window.WorldForge.Core.GameState.addNotification(
                  'success',
                  'Ukończenie Inwestycji Strategicznej!',
                  `Megaprojekt "${p.name}" został oddany do eksploatacji! Gospodarka zyskuje długoterminowe korzyści.`,
                  countryId
                );
              }
            }
          }

        } catch (err) {
          console.error(`[ProjectSystem] Error processing ${countryId}:`, err);
        }
      }
    },

    applyCompletionBonuses(country, p) {
      const eff = p.effects || {};
      if (eff.energyCapacityGW) country.energy.totalCapacityGW += eff.energyCapacityGW;
      if (eff.cleanEnergyShare) country.energy.cleanEnergyShare = Math.min(100, country.energy.cleanEnergyShare + eff.cleanEnergyShare);
      if (eff.highSpeedRailKm) country.infrastructure.highSpeedRailKm += eff.highSpeedRailKm;
      if (eff.taxEfficiency) country.taxes.efficiency = Math.min(99, country.taxes.efficiency + eff.taxEfficiency);
      if (eff.deterrenceScore) country.military.deterrenceScore = Math.min(100, country.military.deterrenceScore + eff.deterrenceScore);
      if (eff.seaportsCapacity) country.infrastructure.seaportsCapacity = Math.min(100, country.infrastructure.seaportsCapacity + eff.seaportsCapacity);
      if (eff.hospitalBedsPer1000) country.infrastructure.hospitalBedsPer1000 += eff.hospitalBedsPer1000;
    }
  };

  window.WorldForge.Systems.Project = ProjectSystem;
})();
