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
                    const resMeta = resourcesList.find(r => r.id === fac.sector);
                    const price = (state.globalMarket && state.globalMarket.prices[fac.sector]) || (resMeta ? resMeta.basePrice : 150);
                    const estProfit = (fac.ownership === 'PRIVATE')
                      ? null
                      : Math.round(fac.capacityBoost * (((country.businesses && country.businesses.capacityUtilization) || 78) / 100) * price * 1000 * 0.05);
                    window.WorldForge.Core.GameState.addNotification(
                      'success',
                      'Oddanie Fabryki do Użytku!',
                      `Zakład przemysłowy "${fac.name}" (${fac.sector}) rozpoczął regularną produkcję! Zdolności wytwórcze wzrosły o +${fac.capacityBoost} jedn.` +
                      (fac.isMine ? ` Wydobycie: ${fac.capacityBoost} t złota/rok do rezerw państwa.` : '') +
                      (!fac.isMine && estProfit ? ` Szacowana dywidenda państwowa: ${window.WorldForge.Format.money(estProfit, 'USD')}/m-c.` : ' (zakład prywatny — brak dywidendy dla skarbu).'),
                      countryId
                    );
                  }
                }
              }
            }
          }

          // 1b. GOLD MINES: wydobycie do rezerw państwa (NIE na rynek!)
          // Kluczowa zasada: wykopanie złota nie rusza cen rynkowych — skarbiec
          // rośnie, dopiero SPRZEDAŻ na giełdzie uderza w cenę (market depth).
          if (country.factories && country.factories.length > 0 && country.portfolio) {
            if (!country.portfolio.commodities) country.portfolio.commodities = {};
            const market = window.WorldForge.Core.GameState.getExchangeMarket();
            const goldItem = market.commodities.find(c => c.id === 'gold');
            const goldPrice = goldItem ? goldItem.currentPrice : 4500;
            const OZ_PER_TONNE = (window.WorldForge.Data.GoldReserves && window.WorldForge.Data.GoldReserves.OZ_PER_TONNE) || 32150.7;

            for (const fac of country.factories) {
              if (!fac.isMine || fac.status !== 'ACTIVE') continue;

              const utilization = ((country.businesses && country.businesses.capacityUtilization) || 78) / 100;
              const monthlyTonnes = (fac.capacityBoost / 12) * utilization;
              const monthlyOz = Math.round(monthlyTonnes * OZ_PER_TONNE);
              const operatingCost = Math.round(monthlyOz * (fac.aiscPerOz || 1900));

              // Brak gotówki na koszty wydobycia -> kopalnia przechodzi w tryb PAUSED
              if (country.treasury < operatingCost) {
                fac.status = 'PAUSED';
                fac.lastMonthlyOz = 0;
                fac.lastMonthlyProfit = 0;
                if (countryId === state.playerCountryId) {
                  window.WorldForge.Core.GameState.addNotification(
                    'warning',
                    'Kopalnia Złota Wstrzymana',
                    `"${fac.name}" zaprzestała wydobycia — Skarb Państwa nie pokrywa kosztów operacyjnych (${window.WorldForge.Format.money(operatingCost, 'USD')}/m-c). Wznów w zakładce Gospodarka.`,
                    countryId
                  );
                }
                continue;
              }

              country.treasury -= operatingCost;
              country.portfolio.commodities.gold = (country.portfolio.commodities.gold || 0) + monthlyOz;
              const grossValue = Math.round(monthlyOz * goldPrice);
              fac.lastMonthlyOz = monthlyOz;
              fac.lastMonthlyProfit = grossValue - operatingCost;
              fac.lastMonthlyCost = operatingCost;
            }
          }

          // 2. Dividends from state-owned industrial enterprises
          // Państwowe zakłady (ownership: 'STATE') odprowadzają miesięczną dywidendę
          // do Skarbu Państwa: ~5% przychodów brutto po uwzględnieniu wykorzystania
          // mocy i ceny rynkowej surowca sektora. Prywatne nie płacą dywidendy
          // (kosztują skarb 45% mniej przy budowie).
          let stateDividends = 0;
          if (Array.isArray(country.factories)) {
            for (const fac of country.factories) {
              if (fac.status !== 'ACTIVE') { fac.lastMonthlyProfit = fac.isMine ? 0 : fac.lastMonthlyProfit; fac.lastMonthlySurplus = 0; continue; }
              if (fac.ownership === 'PRIVATE') { fac.lastMonthlyProfit = null; continue; }
              // Kopalnie złota mają własny model (wydobycie do rezerw, zysk = cena - AISC)
              if (fac.isMine) { fac.lastMonthlySurplus = 0; continue; }

              const resMeta = resourcesList.find(r => r.id === fac.sector);
              const price = (state.globalMarket && state.globalMarket.prices[fac.sector]) || (resMeta ? resMeta.basePrice : 150);
              const utilization = ((country.businesses && country.businesses.capacityUtilization) || 78) / 100;
              const grossMonthly = fac.capacityBoost * utilization * price * 1000;
              const dividend = Math.round(grossMonthly * 0.05);

              fac.lastMonthlyProfit = dividend;
              stateDividends += dividend;

              // Nadwyżka produkcyjna zakładu trafia do państwowego magazynu
              // (gracz może ją sprzedawać na giełdzie surowców / w kontraktach).
              // Magazyn ma limit, by nadmiar nie rozsadzał zapisu gry.
              if (prod[fac.sector]) {
                const surplusUnits = Math.round(fac.capacityBoost * utilization * 0.15);
                const stockCap = Math.max(60000, prod[fac.sector].capacity * 1.5);
                prod[fac.sector].stockpile = Math.min(stockCap, prod[fac.sector].stockpile + surplusUnits);
                fac.lastMonthlySurplus = surplusUnits;
              }
            }
          }
          country.stateEnterpriseDividends = stateDividends;

          // 3. Evaluate input resource bottlenecks and compute output
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
