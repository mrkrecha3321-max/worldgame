/**
 * WorldForge: Nations - Global Resource & Commodity Markets System
 * Aggregates global supply and demand for 16 key commodities and clears global spot prices.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const ResourceSystem = {
    /**
     * Process global commodity price adjustments
     * @param {Object} state
     * @param {number} turnNumber
     */
    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;
      const R = window.WorldForge.Core.Random;
      const resourcesList = window.WorldForge.Data.Resources || [];
      const globalMarket = state.globalMarket;

      for (const res of resourcesList) {
        let globalSupply = 0;
        let globalDemand = 0;

        // Sum across all countries
        for (const country of Object.values(state.countries)) {
          const item = country.production ? country.production[res.id] : null;
          if (item) {
            globalSupply += item.output;
            globalDemand += item.consumption;
          }
        }

        globalSupply = Math.max(10, globalSupply);
        globalDemand = Math.max(10, globalDemand);

        if (!globalMarket.globalVolume[res.id]) {
          globalMarket.globalVolume[res.id] = { supply: globalSupply, demand: globalDemand };
        } else {
          globalMarket.globalVolume[res.id].supply = globalSupply;
          globalMarket.globalVolume[res.id].demand = globalDemand;
        }

        // Supply/Demand price elasticity
        const imbalanceRatio = (globalDemand - globalSupply) / globalSupply;
        const currentPrice = globalMarket.prices[res.id] || res.basePrice;
        const randomNoise = R.gaussian(0, 0.015);
        
        const priceChangeRate = (imbalanceRatio * 0.12) + randomNoise;
        const clampedChange = V.sanitizeNumber(priceChangeRate, 0, -0.20, 0.25);
        
        let newPrice = currentPrice * (1 + clampedChange);
        // Ensure price stays in realistic corridor around base price (0.3x to 4.0x base price)
        newPrice = V.sanitizeNumber(newPrice, res.basePrice, res.basePrice * 0.35, res.basePrice * 4.5);

        globalMarket.prices[res.id] = Math.round(newPrice * 100) / 100;

        if (!globalMarket.priceHistory[res.id]) globalMarket.priceHistory[res.id] = [];
        globalMarket.priceHistory[res.id].push(globalMarket.prices[res.id]);
        if (globalMarket.priceHistory[res.id].length > 36) globalMarket.priceHistory[res.id].shift();
      }
    }
  };

  window.WorldForge.Systems.Resource = ResourceSystem;
})();
