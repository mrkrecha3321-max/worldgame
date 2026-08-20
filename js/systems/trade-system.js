/**
 * WorldForge: Nations - International Trade & Bilateral Agreements System
 * Supports custom volume and custom pricing for both spot markets and bilateral long-term contracts.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const TradeSystem = {
    /**
     * Realny wpływ zlecenia na rynek (market impact / slippage).
     * Duże zlecenia pochłaniają płynność rynku i przesuwają cenę wykonania
     * przeciwko inwestorowi: kupno drożej, sprzedaż taniej.
     * @param {number} amount - wolumen zlecenia (jednostki)
     * @param {string} resourceId
     * @param {Object} state
     * @returns {number} impact w przedziale [0, 0.5]
     */
    computeMarketImpact(amount, resourceId, state) {
      const gm = state.globalMarket;
      const volumes = gm?.globalVolume?.[resourceId];
      const liquidity = Math.max(250000, ((volumes?.supply || 1000000) + (volumes?.demand || 1000000)) / 2);
      return Math.min(0.5, Math.max(0, amount) / liquidity);
    },

    executeMarketTrade(state, countryId, payload) {
      const V = window.WorldForge.Core.Validators;
      const F = window.WorldForge.Format;
      const { resourceId, action, amount } = payload;
      const country = state.countries[countryId];
      if (!country || !country.production[resourceId]) {
        return { success: false, reason: 'Nieprawidłowy zasób lub państwo' };
      }

      const resMeta = window.WorldForge.Data.Resources.find(r => r.id === resourceId);
      const spotPrice = state.globalMarket.prices[resourceId] || (resMeta ? resMeta.basePrice : 100);
      const cleanAmount = Math.floor(V.clampNonNegative(amount));
      if (cleanAmount <= 0) return { success: false, reason: 'Ilość musi być większa od zera' };

      // Rynek spot ma ograniczoną płynność: pojedyncze zlecenie nie może
      // przewyższać 75% miesięcznej płynności globalnej danego surowca.
      // Większe wolumeny trzeba realizować stopniowo lub umowami bilateralnymi.
      const gm = state.globalMarket;
      const volumes = gm?.globalVolume?.[resourceId];
      const liquidity = Math.max(250000, ((volumes?.supply || 1000000) + (volumes?.demand || 1000000)) / 2);
      if (cleanAmount > liquidity * 0.75) {
        return {
          success: false,
          reason: `Zlecenie ${F.number(cleanAmount, { rawText: true })} jedn. przekracza płynność rynku spot ${resMeta.name} (maks. ${F.number(Math.floor(liquidity * 0.75), { rawText: true })} jedn./zlecenie). Rozbij transakcję na mniejsze części lub negocjuj umowę bilateralną.`
        };
      }

      // UWAGA (poprawka balansu): zlecenia spot wykonują się WYŁĄCNIE po cenie rynkowej
      // z uwzględnieniem wpływu na rynek. Niestandardowe ceny są dostępne wyłącznie
      // w negocjowanych umowach bilateralnych (i tam są walidowane przez drugą stronę).
      // Zapobiega to drukowaniu nierealnych pieniędzy przez ręczne wpisanie ceny sprzedaży.
      const impact = this.computeMarketImpact(cleanAmount, resourceId, state);

      if (action === 'BUY') {
        const execPrice = spotPrice * (1 + impact);
        const totalValueUsd = Math.round(cleanAmount * execPrice * 1000); // Exact base units in USD

        if (country.treasury < totalValueUsd) {
          return { success: false, reason: `Niewystarczające środki w Skarbie Państwa (wymagane ${F.money(totalValueUsd, 'USD')})` };
        }
        country.treasury -= totalValueUsd;
        country.production[resourceId].stockpile += cleanAmount;

        // Popyt podbija cenę światową (proporcjonalnie do wpływu zlecenia)
        state.globalMarket.prices[resourceId] = Math.min(
          (resMeta ? resMeta.basePrice : 100) * 4,
          Math.round(spotPrice * (1 + impact * 0.35) * 10) / 10
        );

        window.WorldForge.Core.GameState.addNotification(
          'info',
          'Zakup Surowców na Giełdzie',
          `Zakupiono ${F.number(cleanAmount, { rawText: true })} ${resMeta.unit} ${resMeta.name} po efektywnej cenie $${execPrice.toFixed(1)}/jedn. (rynkowa: $${spotPrice.toFixed(1)}, wpływ na rynek: +${(impact * 100).toFixed(1)}%). Koszt: ${F.money(totalValueUsd, 'USD')}.`,
          countryId
        );

        return {
          success: true,
          data: {
            action: 'BUY',
            resourceId,
            amount: cleanAmount,
            unitPrice: Math.round(execPrice * 10) / 10,
            marketImpact: impact,
            totalCost: totalValueUsd,
            newStockpile: country.production[resourceId].stockpile
          }
        };
      } else { // SELL
        if (country.production[resourceId].stockpile < cleanAmount) {
          return { success: false, reason: `Niewystarczające zapasy w magazynie (posiadasz ${F.number(country.production[resourceId].stockpile, { rawText: true })})` };
        }

        const execPrice = spotPrice * (1 - impact);
        const totalValueUsd = Math.round(cleanAmount * execPrice * 1000);

        country.production[resourceId].stockpile -= cleanAmount;
        country.treasury += totalValueUsd;

        // Podaż cenyowo ochładza rynek światowy
        state.globalMarket.prices[resourceId] = Math.max(
          (resMeta ? resMeta.basePrice : 100) * 0.25,
          Math.round(spotPrice * (1 - impact * 0.35) * 10) / 10
        );

        window.WorldForge.Core.GameState.addNotification(
          'success',
          'Sprzedaż Surowców – Zasilenie Skarbu',
          `Pomyślnie sprzedano ${F.number(cleanAmount, { rawText: true })} ${resMeta.unit} ${resMeta.name} po efektywnej cenie $${execPrice.toFixed(1)}/jedn. (rynkowa: $${spotPrice.toFixed(1)}, wpływ na rynek: -${(impact * 100).toFixed(1)}%). Wpływ do Skarbu Państwa: +${F.money(totalValueUsd, 'USD')}!`,
          countryId
        );

        return {
          success: true,
          data: {
            action: 'SELL',
            resourceId,
            amount: cleanAmount,
            unitPrice: Math.round(execPrice * 10) / 10,
            marketImpact: impact,
            totalProceeds: totalValueUsd,
            newStockpile: country.production[resourceId].stockpile
          }
        };
      }
    },

    proposeBilateralDeal(state, exporterId, payload, turn = 1) {
      const V = window.WorldForge.Core.Validators;
      const F = window.WorldForge.Format;
      const { importerId, resourceId, monthlyAmount, agreedPrice, durationMonths, isExclusive } = payload;
      const exporter = state.countries[exporterId];
      const importer = state.countries[importerId];

      if (!exporter || !importer) return { success: false, reason: 'Nieprawidłowe państwa kontraktu' };
      if (!exporter.production[resourceId]) return { success: false, reason: 'Eksporter nie posiada produkcji tego dobra' };

      const cleanAmount = V.clampNonNegative(monthlyAmount);
      const cleanPrice = V.clampNonNegative(agreedPrice);
      const cleanDuration = Math.min(60, Math.max(3, parseInt(durationMonths, 10) || 12));

      const spotPrice = state.globalMarket.prices[resourceId] || 100;

      // Walidacja realności kontraktu względem rynku (obie strony bronią swoich interesów)
      if (importerId !== state.playerCountryId) {
        // AI-importer: nie zapłaci znacznie powyżej ceny rynkowej
        const relScore = importer.diplomacy?.relations[exporterId] || 0;

        if (relScore < -20) {
          return { success: false, reason: `Państwo ${importer.namePl} odrzuciło propozycję z powodu wrogich relacji dyplomatycznych.` };
        }
        if (cleanPrice > spotPrice * 1.15) {
          return { success: false, reason: `Państwo ${importer.namePl} odrzuciło cenę jako niekorzystną rynkowo (cena spot: $${spotPrice.toFixed(1)}, akceptowalne maks. $${(spotPrice * 1.15).toFixed(1)}).` };
        }
      }
      if (exporterId !== state.playerCountryId) {
        // AI-eksporter: nie sprzeda poniżej kosztu / znacznie poniżej rynku
        if (cleanPrice < spotPrice * 0.85) {
          return { success: false, reason: `Państwo ${exporter.namePl} (eksporter) odrzuciło cenę jako nieopłacalną (cena spot: $${spotPrice.toFixed(1)}, minimalna akceptowana: $${(spotPrice * 0.85).toFixed(1)}).` };
        }
      }

      // Eksporter nie może obiecać więcej, niż realnie jest w stanie dostarczyć
      const expProdCap = exporter.production?.[resourceId];
      if (expProdCap && cleanAmount > (expProdCap.stockpile || 0) + (expProdCap.output || 0) * 1.5) {
        return {
          success: false,
          reason: `Nie posiadasz mocy produkcyjnych, by zagwarantować ${F.number(cleanAmount, { rawText: true })} jedn./m-c. Maksymalna realna wielkość kontraktu: ${F.number(Math.round((expProdCap.stockpile || 0) + (expProdCap.output || 0) * 1.5), { rawText: true })} jedn.`
        };
      }

      const deal = {
        id: 'deal_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        exporterId,
        importerId,
        resourceId,
        monthlyAmount: cleanAmount,
        agreedPrice: cleanPrice,
        remainingMonths: cleanDuration,
        totalDurationMonths: cleanDuration,
        isExclusive: !!isExclusive,
        startTurn: turn
      };

      if (!state.bilateralDeals) state.bilateralDeals = [];
      state.bilateralDeals.push(deal);

      if (exporter.diplomacy?.relations[importerId] !== undefined) {
        exporter.diplomacy.relations[importerId] = V.clampRelation(exporter.diplomacy.relations[importerId] + 5);
      }
      if (importer.diplomacy?.relations[exporterId] !== undefined) {
        importer.diplomacy.relations[exporterId] = V.clampRelation(importer.diplomacy.relations[exporterId] + 5);
      }

      window.WorldForge.Core.GameState.addNotification(
        'success',
        'Zawarto Umowę Handlową',
        `Podpisano ${cleanDuration}-miesięczny kontrakt z ${importer.namePl} na dostawę ${F.number(cleanAmount, { rawText: true })} jedn. ${resourceId} po cenie $${cleanPrice}/jedn.`,
        exporterId
      );

      return { success: true, data: deal };
    },

    cancelBilateralDeal(state, countryId, dealId) {
      if (!state.bilateralDeals) return { success: false, reason: 'Brak aktywnych umów' };
      const index = state.bilateralDeals.findIndex(d => d.id === dealId);
      if (index === -1) return { success: false, reason: 'Nie znaleziono umowy handlowej' };

      const deal = state.bilateralDeals[index];
      state.bilateralDeals.splice(index, 1);

      const otherId = (deal.exporterId === countryId) ? deal.importerId : deal.exporterId;
      const otherCountry = state.countries[otherId];
      if (otherCountry && otherCountry.diplomacy?.relations[countryId] !== undefined) {
        otherCountry.diplomacy.relations[countryId] = window.WorldForge.Core.Validators.clampRelation(
          otherCountry.diplomacy.relations[countryId] - 10
        );
      }

      return { success: true, data: deal };
    },

    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;
      if (!state.bilateralDeals) state.bilateralDeals = [];

      for (let i = state.bilateralDeals.length - 1; i >= 0; i--) {
        const deal = state.bilateralDeals[i];
        const exporter = state.countries[deal.exporterId];
        const importer = state.countries[deal.importerId];

        if (!exporter || !importer) {
          state.bilateralDeals.splice(i, 1);
          continue;
        }

        const expProd = exporter.production ? exporter.production[deal.resourceId] : null;
        const impProd = importer.production ? importer.production[deal.resourceId] : null;

        if (expProd && impProd) {
          // Dostawa ograniczona realnymi zapasami (nie "zapasy + produkcja z przyszłości")
          // oraz wypłacalnością importera (nikt nie kupuje za pieniądze, których nie ma).
          const unitCostUsd = Math.max(1, Math.round(deal.agreedPrice * 1000));
          const affordableAmount = Math.floor(Math.max(0, importer.treasury) / unitCostUsd);
          let deliverAmount = Math.min(deal.monthlyAmount, expProd.stockpile || 0, affordableAmount);

          if (deliverAmount > 0) {
            const paymentTotal = Math.round(deliverAmount * deal.agreedPrice * 1000);
            expProd.stockpile = V.clampNonNegative(expProd.stockpile - deliverAmount);
            exporter.treasury += paymentTotal;
            impProd.stockpile += deliverAmount;
            importer.treasury = V.sanitizeNumber(importer.treasury - paymentTotal, 0, -Infinity, Infinity);
          }

          // Śledzenie niewykonania kontraktu (niewypłacalny importer / brak towaru)
          if (deliverAmount < deal.monthlyAmount * 0.5) {
            deal.missedPayments = (deal.missedPayments || 0) + 1;
            if (deal.missedPayments >= 3) {
              const cancelledBy = (deliverAmount <= 0) ? 'importer' : 'eksporter';
              const partnerId = (cancelledBy === 'importer') ? deal.importerId : deal.exporterId;
              const partner = state.countries[partnerId];
              if (partner?.diplomacy?.relations[deal.exporterId] !== undefined) {
                partner.diplomacy.relations[deal.exporterId] = V.clampRelation(partner.diplomacy.relations[deal.exporterId] - 10);
              }
              if (deal.exporterId === state.playerCountryId || deal.importerId === state.playerCountryId) {
                window.WorldForge.Core.GameState.addNotification(
                  'danger',
                  'Kontrakt Bilateralny Zerwany',
                  `Umowa na ${deal.resourceId} została wypowiedziana po ${deal.missedPayments} miesiącach niewykonania (${cancelledBy === 'importer' ? 'brak wypłacalności importera' : 'brak dostaw'}). Relacje dyplomatyczne ochłodzone.`,
                  state.playerCountryId
                );
              }
              state.bilateralDeals.splice(i, 1);
              continue;
            }
          } else {
            deal.missedPayments = 0;
          }
        }

        deal.remainingMonths -= 1;
        if (deal.remainingMonths <= 0) {
          state.bilateralDeals.splice(i, 1);
        }
      }

      for (const country of Object.values(state.countries)) {
        if (!country.production) continue;
        for (const [resId, item] of Object.entries(country.production)) {
          const domesticShare = item.output / Math.max(1, item.consumption);
          let dependency = 0;
          if (domesticShare < 0.3) dependency = 85.0;
          else if (domesticShare < 0.7) dependency = 55.0;
          else if (domesticShare < 1.0) dependency = 25.0;
          else dependency = 5.0;

          item.dependencyOnTopSupplierPercent = V.clampPercent(dependency);
        }
      }
    }
  };

  window.WorldForge.Systems.Trade = TradeSystem;
})();
