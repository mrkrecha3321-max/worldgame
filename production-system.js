/**
 * WorldForge: Nations - Production & Industrial Factory Simulation System
 * Manages domestic production, input bottlenecks, factory construction and operational output.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const ProductionSystem = {
    /**
     * Process monthly production cycles and factory construction
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;
      const resourcesList = window.WorldForge.Data.Resources || [];

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const prod = country.production;
          if (!prod) continue;

          // 1. Process Factory Construction & Commissioning
          if (country.factories && country.factories.length > 0) {
            for (const fac of country.factories) {
              if (fac.status === 'BUILDING') {
                fac.remainingMonths -= 1;
                if (fac.remainingMonths <= 0) {
                  fac.status = 'ACTIVE';
                  // Boost sector production capacity
                  if (prod[fac.sector]) {
                    prod[fac.sector].capacity += fac.capacityBoost;
                  }
                  if (countryId === state.playerCountryId) {
                    window.WorldForge.Core.GameState.addNotification(
                      'success',
                      'Oddanie Fabryki do Użytku!',
                      `Zakład przemysłowy "${fac.name}" (${fac.sector}) rozpoczął regularną produkcję! Zdolności wytwórcze wzrosły o +${fac.capacityBoost} jedn.`,
                      countryId
                    );
                  }
                }
              }
            }
          }

          // 2. Evaluate input resource bottlenecks and compute output
          for (const resMeta of resourcesList) {
            const item = prod[resMeta.id];
            if (!item) continue;

            let bottleneckRatio = 1.0;

            // Check if input dependencies are satisfied
            if (resMeta.inputs) {
              for (const [inputId, reqAmount] of Object.entries(resMeta.inputs)) {
                const inputStock = prod[inputId]?.stockpile || 0;
                const neededTotal = (item.capacity * reqAmount);

                if (inputStock < neededTotal * 0.2) {
                  bottleneckRatio = Math.min(bottleneckRatio, 0.4);
                } else if (inputStock < neededTotal * 0.8) {
                  bottleneckRatio = Math.min(bottleneckRatio, 0.75);
                }
              }
            }

            // Output calculation
            const effectiveCapacity = item.capacity * bottleneckRatio;
            item.output = V.clampNonNegative(Math.round(effectiveCapacity * (country.businesses.capacityUtilization / 100)));

            // Consume inputs from stockpiles
            if (resMeta.inputs) {
              for (const [inputId, reqAmount] of Object.entries(resMeta.inputs)) {
                const consumed = Math.round(item.output * reqAmount * 0.1);
                if (prod[inputId]) {
                  prod[inputId].stockpile = V.clampNonNegative(prod[inputId].stockpile - consumed);
                }
              }
            }

            // Domestic Consumption
            const popFactor = country.population.total / 1e6;
            if (resMeta.id === 'food') {
              item.consumption = Math.round(popFactor * 1.05 * 1000);
            } else if (resMeta.id === 'water') {
              item.consumption = Math.round(popFactor * 0.95 * 1000);
            } else if (resMeta.id === 'energy') {
              item.consumption = Math.round(popFactor * 1.00 * 1000 + (country.economy.gdpNominal / 3e9));
            } else {
              item.consumption = Math.round(item.output * 0.85);
            }

            // Update Stockpiles
            const netFlow = item.output + item.importVolume - item.consumption - item.exportVolume;
            item.stockpile = V.clampNonNegative(item.stockpile + netFlow);

            // Recompute export/import desires
            if (item.output > item.consumption) {
              item.exportVolume = Math.round(item.output - item.consumption);
              item.importVolume = 0;
            } else {
              item.importVolume = Math.round(item.consumption - item.output);
              item.exportVolume = 0;
            }
          }

        } catch (err) {
          console.error(`[ProductionSystem] Error processing ${countryId}:`, err);
        }
      }
    }
  };

  window.WorldForge.Systems.Production = ProductionSystem;
})();
