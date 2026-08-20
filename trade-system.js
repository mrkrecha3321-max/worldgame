/**
 * WorldForge: Nations - International Trade & Bilateral Agreements System
 * Supports custom volume and custom pricing for both spot markets and bilateral long-term contracts.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const TradeSystem = {
    executeMarketTrade(state, countryId, payload) {
      const V = window.WorldForge.Core.Validators;
      const F = window.WorldForge.Format;
      const { resourceId, action, amount, customPrice } = payload;
      const country = state.countries[countryId];
      if (!country || !country.production[resourceId]) {
        return { success: false, reason: 'Nieprawidłowy zasób lub państwo' };
      }

      const resMeta = window.WorldForge.Data.Resources.find(r => r.id === resourceId);
      const spotPrice = state.globalMarket.prices[resourceId] || (resMeta ? resMeta.basePrice : 100);
      const unitPrice = (customPrice && customPrice > 0) ? customPrice : spotPrice;
      const cleanAmount = V.clampNonNegative(amount);
      if (cleanAmount <= 0) return { success: false, reason: 'Ilość musi być większa od zera' };

      const totalValueUsd = Math.round(cleanAmount * unitPrice * 1000); // Exact base units in USD

      if (action === 'BUY') {
        if (country.treasury < totalValueUsd) {
          return { success: false, reason: `Niewystarczające środki w Skarbie Państwa (wymagane ${F.money(totalValueUsd, 'USD')})` };
        }
        country.treasury -= totalValueUsd;
        country.production[resourceId].stockpile += cleanAmount;

        window.WorldForge.Core.GameState.addNotification(
          'info',
          'Zakup Surowców na Giełdzie',
          `Zakupiono ${F.number(cleanAmount, { rawText: true })} ${resMeta.unit} ${resMeta.name} po cenie $${unitPrice.toFixed(1)}/jedn. Koszt: ${F.money(totalValueUsd, 'USD')}.`,
          countryId
        );

        return {
          success: true,
          data: {
            action: 'BUY',
            resourceId,
            amount: cleanAmount,
            unitPrice: unitPrice,
            totalCost: totalValueUsd,
            newStockpile: country.production[resourceId].stockpile
          }
        };
      } else { // SELL
        if (country.production[resourceId].stockpile < cleanAmount) {
          return { success: false, reason: `Niewystarczające zapasy w magazynie (posiadasz ${F.number(country.production[resourceId].stockpile, { rawText: true })})` };
        }
        country.production[resourceId].stockpile -= cleanAmount;
        country.treasury += totalValueUsd;

        window.WorldForge.Core.GameState.addNotification(
          'success',
          'Sprzedaż Surowców – Zasilenie Skarbu',
          `Pomyślnie sprzedano ${F.number(cleanAmount, { rawText: true })} ${resMeta.unit} ${resMeta.name} po cenie $${unitPrice.toFixed(1)}/jedn. Wpływ do Skarbu Państwa: +${F.money(totalValueUsd, 'USD')}!`,
          countryId
        );

        return {
          success: true,
          data: {
            action: 'SELL',
            resourceId,
            amount: cleanAmount,
            unitPrice: unitPrice,
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

      if (importerId !== state.playerCountryId) {
        const spotPrice = state.globalMarket.prices[resourceId] || 100;
        const relScore = importer.diplomacy?.relations[exporterId] || 0;

        if (relScore < -20) {
          return { success: false, reason: `Państwo ${importer.namePl} odrzuciło propozycję z powodu wrogich relacji dyplomatycznych.` };
        }
        if (cleanPrice > spotPrice * 1.25) {
          return { success: false, reason: `Państwo ${importer.namePl} odrzuciło cenę jako niekorzystną rynkowo (cena spot: $${spotPrice}).` };
        }
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
          const deliverAmount = Math.min(deal.monthlyAmount, expProd.stockpile + expProd.output);
          const paymentTotal = Math.round(deliverAmount * deal.agreedPrice * 1000);

          expProd.stockpile = V.clampNonNegative(expProd.stockpile - deliverAmount);
          exporter.treasury += paymentTotal;

          impProd.stockpile += deliverAmount;
          importer.treasury = V.sanitizeNumber(importer.treasury - paymentTotal, 0, -Infinity, Infinity);
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
