/**
 * WorldForge: Nations - Bot Strategic AI System
 * Simulates autonomous decision loops for all non-player nations across 9 distinct archetypes.
 * Formulates and dispatches commands strictly through WorldForge.Commands without cheating.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const BotSystem = {
    /**
     * Process turn decisions for all bot countries
     * @param {Object} state
     * @param {number} turnNumber
     */
    processAllBots(state, turnNumber) {
      const playerCountryId = state.playerCountryId;

      for (const [countryId, country] of Object.entries(state.countries)) {
        if (countryId === playerCountryId) continue; // Skip player

        try {
          this.processBotDecisions(state, country, turnNumber);
        } catch (err) {
          console.error(`[BotSystem] Error processing bot ${countryId}:`, err);
        }
      }
    },

    processBotDecisions(state, country, turnNumber) {
      const Commands = window.WorldForge.Core.Commands;
      const archetype = country.botArchetype || 'Cautious Balance';
      const eco = country.economy;
      const budget = country.budget;
      const cb = country.centralBank;
      const debt = country.debt;

      // 1. Central Bank Interest Rate Management (if autonomous)
      if (!country.monetaryUnion || country.isUnionLeader) {
        if (eco.inflation > 5.5 && cb.baseRate < 12.0) {
          Commands.dispatch({
            type: 'SET_CENTRAL_BANK_RATE',
            countryId: country.id,
            payload: { rate: cb.baseRate + 0.5 }
          });
        } else if (eco.inflation < 2.0 && eco.gdpGrowthYoY < 1.5 && cb.baseRate > 1.0) {
          Commands.dispatch({
            type: 'SET_CENTRAL_BANK_RATE',
            countryId: country.id,
            payload: { rate: Math.max(0.5, cb.baseRate - 0.25) }
          });
        }
      }

      // 2. Fiscal Deficit & Debt Management
      if (budget.balanceMonthly < -1500 && country.treasury < 5000) {
        // High deficit stress: issue sovereign bonds to stabilize liquidity
        Commands.dispatch({
          type: 'ISSUE_BONDS',
          countryId: country.id,
          payload: {
            amount: 2500,
            maturityMonths: 60,
            currency: country.currency,
            bondType: 'Deficit Refinancing'
          }
        });

        // Moderate tax adjustment
        if (country.taxes.citRate < 24.0) {
          Commands.dispatch({
            type: 'SET_TAX_RATE',
            countryId: country.id,
            payload: { taxType: 'citRate', rate: country.taxes.citRate + 0.5 }
          });
        }
      }

      // 3. Commercial Banking Rescue (if bank is distressed and treasury allows)
      if (country.commercialBanks) {
        for (const bank of country.commercialBanks) {
          if (bank.carSolvencyRatio < 10.0 && country.treasury > 2000) {
            Commands.dispatch({
              type: 'BAILOUT_BANK',
              countryId: country.id,
              payload: { bankId: bank.id, amount: 800 }
            });
            break;
          }
        }
      }

      // 4. Research & Scientific Development
      if (country.research && !country.research.activeTechId) {
        const allTechs = window.WorldForge.Data.Technologies || [];
        // Find available techs whose prerequisites are satisfied
        const available = allTechs.filter(t => {
          if (country.research.unlockedTechs.includes(t.id)) return false;
          if (t.prerequisites && t.prerequisites.length > 0) {
            return t.prerequisites.every(p => country.research.unlockedTechs.includes(p));
          }
          return true;
        });

        if (available.length > 0) {
          // Prioritize by archetype
          let chosenTech = available[0];
          if (archetype === 'Potęga militarna') {
            const defenseTech = available.find(t => t.branch === 'defense');
            if (defenseTech) chosenTech = defenseTech;
          } else if (archetype === 'Zielona transformacja') {
            const greenTech = available.find(t => t.branch === 'energy');
            if (greenTech) chosenTech = greenTech;
          } else if (archetype === 'Centrum technologiczne') {
            const techTech = available.find(t => t.branch === 'digital' || t.branch === 'banking');
            if (techTech) chosenTech = techTech;
          }

          Commands.dispatch({
            type: 'START_RESEARCH',
            countryId: country.id,
            payload: { techId: chosenTech.id }
          });
        }
      }

      // 5. Strategic Megaprojects Execution (if financially robust)
      if (country.projects && country.projects.active.length === 0 && country.treasury > 12000) {
        const allProjects = window.WorldForge.Data.Projects || [];
        const candidate = allProjects.find(p => !country.projects.completed.some(c => c.id === p.id) && country.treasury > p.totalCost * 0.15);
        if (candidate) {
          Commands.dispatch({
            type: 'START_PROJECT',
            countryId: country.id,
            payload: { projectId: candidate.id }
          });
        }
      }
    }
  };

  window.WorldForge.Systems.Bot = BotSystem;
})();
