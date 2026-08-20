/**
 * WorldForge: Nations - Global Exchange & Sovereign Wealth Portfolio System
 * Simulates order book market impact, equities, commodities, gold vaults, dividends and takeovers.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const ExchangeSystem = {
    /**
     * Rynek giełdowy żyje w stanie gry (state.exchange), nie w statycznych danych.
     * Dzięki temu ceny zapisują się w save'ach, synchronizują w multiplayerze
     * i resetują przy nowej grze.
     */
    getMarket(state) {
      if (state && state.exchange && Array.isArray(state.exchange.commodities)) return state.exchange;
      const gs = window.WorldForge.Core.GameState;
      if (gs && typeof gs.ensureExchangeMarket === 'function') {
        return gs.ensureExchangeMarket();
      }
      return window.WorldForge.Data.Exchange;
    },

    /**
     * Buy Gold or Commodity on Exchange
     */
    buyCommodity(country, commodityId, amount) {
      const V = window.WorldForge.Core.Validators;
      const F = window.WorldForge.Format;
      const commList = this.getMarket(window.WorldForge.Core.GameState.getState()).commodities;
      const item = commList.find(c => c.id === commodityId);
      if (!item) return { success: false, reason: 'Nie znaleziono wybranego surowca' };

      const cleanAmount = V.clampNonNegative(amount);
      if (cleanAmount <= 0) return { success: false, reason: 'Ilość musi być większa od zera' };

      const totalCost = Math.round(cleanAmount * item.currentPrice);
      if (country.treasury < totalCost) {
        return { success: false, reason: `Brak wystarczających środków w Skarbie Państwa (wymagane ${F.money(totalCost, 'USD')})` };
      }

      country.treasury -= totalCost;
      if (!country.portfolio) country.portfolio = { commodities: {}, stocks: {}, totalInvested: 0, monthlyDividends: 0 };
      if (!country.portfolio.commodities) country.portfolio.commodities = {};

      const currentQty = country.portfolio.commodities[commodityId] || 0;
      country.portfolio.commodities[commodityId] = currentQty + cleanAmount;

      // Market Impact: Large purchases push market spot price up
      const marketImpactRatio = Math.min(0.20, (totalCost / 5000000000) * 0.02);
      item.currentPrice = Math.round(item.currentPrice * (1 + marketImpactRatio) * 100) / 100;

      // If Gold, apply sovereign rating boost
      if (commodityId === 'gold') {
        const totalGoldOz = country.portfolio.commodities['gold'] || 0;
        if (totalGoldOz > 3000000) { // ~100 tons
          country.debt.riskPremium = Math.max(0.1, country.debt.riskPremium - 0.1);
        }
      }

      window.WorldForge.Core.GameState.addNotification(
        'success',
        'Zakup na Giełdzie Towarowej',
        `Zakupiono ${F.number(cleanAmount, { rawText: true })} ${item.unit} ${item.name} za kwotę ${F.money(totalCost, 'USD')}.`,
        country.id
      );

      return { success: true, data: { commodityId, amount: cleanAmount, cost: totalCost, newPrice: item.currentPrice } };
    },

    /**
     * Sell Gold or Commodity on Exchange
     */
    sellCommodity(country, commodityId, amount) {
      const V = window.WorldForge.Core.Validators;
      const F = window.WorldForge.Format;
      const commList = this.getMarket(window.WorldForge.Core.GameState.getState()).commodities;
      const item = commList.find(c => c.id === commodityId);
      if (!item) return { success: false, reason: 'Nie znaleziono surowca' };

      if (!country.portfolio?.commodities || !country.portfolio.commodities[commodityId]) {
        return { success: false, reason: 'Brak posiadanego surowca w rezerwach' };
      }

      const owned = country.portfolio.commodities[commodityId];
      const cleanAmount = Math.min(owned, V.clampNonNegative(amount));
      if (cleanAmount <= 0) return { success: false, reason: 'Ilość musi być większa od zera' };

      const totalProceeds = Math.round(cleanAmount * item.currentPrice);
      country.treasury += totalProceeds;
      country.portfolio.commodities[commodityId] -= cleanAmount;

      // Market Impact: Selling pushes price down
      const marketImpactRatio = Math.min(0.20, (totalProceeds / 5000000000) * 0.02);
      item.currentPrice = Math.max(item.basePrice * 0.3, Math.round(item.currentPrice * (1 - marketImpactRatio) * 100) / 100);

      window.WorldForge.Core.GameState.addNotification(
        'info',
        'Sprzedaż na Giełdzie Towarowej',
        `Upłynniono ${F.number(cleanAmount, { rawText: true })} ${item.unit} ${item.name}. Wpływ do Skarbu: ${F.money(totalProceeds, 'USD')}.`,
        country.id
      );

      return { success: true, data: { commodityId, amount: cleanAmount, proceeds: totalProceeds, newPrice: item.currentPrice } };
    },

    /**
     * Buy Shares in a Public Corporation
     */
    buyStock(country, ticker, sharesCount) {
      const V = window.WorldForge.Core.Validators;
      const F = window.WorldForge.Format;
      const stocksList = this.getMarket(window.WorldForge.Core.GameState.getState()).stocks;
      const stock = stocksList.find(s => s.ticker === ticker);
      if (!stock) return { success: false, reason: 'Nie znaleziono spółki' };

      const cleanShares = V.clampNonNegative(sharesCount);
      const totalCost = Math.round(cleanShares * stock.sharePrice);

      if (country.treasury < totalCost) {
        return { success: false, reason: `Brak środków w Skarbie Państwa (wymagane ${F.money(totalCost, 'USD')})` };
      }

      country.treasury -= totalCost;
      if (!country.portfolio) country.portfolio = { commodities: {}, stocks: {}, totalInvested: 0, monthlyDividends: 0 };
      if (!country.portfolio.stocks) country.portfolio.stocks = {};

      const currentShares = country.portfolio.stocks[ticker] || 0;
      country.portfolio.stocks[ticker] = currentShares + cleanShares;

      // Check for Hostile Takeover (>50% shares)
      const ownedPercent = (country.portfolio.stocks[ticker] / stock.sharesTotal) * 100;
      if (ownedPercent >= 50.0 && country.id !== stock.countryId) {
        window.WorldForge.Core.GameState.addNotification(
          'success',
          'Wrogie Przejęcie Spółki Zagranicznej!',
          `Twoje państwo przejęło pakiet kontrolny (${ownedPercent.toFixed(1)}%) w spółce ${stock.name} (${stock.countryId})! Całość dywidend i technologii trafia do Ciebie.`,
          country.id
        );
      }

      // Market price tick
      stock.sharePrice = Math.round(stock.sharePrice * (1 + 0.005) * 100) / 100;

      return { success: true, data: { ticker, sharesCount: cleanShares, totalCost, ownedPercent } };
    },

    /**
     * Sell Shares
     */
    sellStock(country, ticker, sharesCount) {
      const V = window.WorldForge.Core.Validators;
      const F = window.WorldForge.Format;
      const stocksList = this.getMarket(window.WorldForge.Core.GameState.getState()).stocks;
      const stock = stocksList.find(s => s.ticker === ticker);
      if (!stock) return { success: false, reason: 'Nie znaleziono spółki' };

      if (!country.portfolio?.stocks || !country.portfolio.stocks[ticker]) {
        return { success: false, reason: 'Brak posiadanych akcji tej spółki' };
      }

      const owned = country.portfolio.stocks[ticker];
      const cleanShares = Math.min(owned, V.clampNonNegative(sharesCount));
      const totalProceeds = Math.round(cleanShares * stock.sharePrice);

      country.treasury += totalProceeds;
      country.portfolio.stocks[ticker] -= cleanShares;

      stock.sharePrice = Math.max(1.0, Math.round(stock.sharePrice * (1 - 0.005) * 100) / 100);

      return { success: true, data: { ticker, sharesCount: cleanShares, proceeds: totalProceeds } };
    },

    /**
     * Monthly Exchange Clearing & Dividend Distribution
     *
     * Model cen: błądzenie losowe + dryf inflacyjny + REGRESJA do wartości
     * fundamentalnej (bazowej). Dzięki regresji odkształcenia wywołane dużymi
     * zakupami/sprzedażami państwa stopniowo zanikają — cena po wykupie
     * wraca ku podstawom, a po zrzuceniu pozycji odbija w górę.
     */
    processMonthly(state, turnNumber) {
      const R = window.WorldForge.Core.Random;
      const market = this.getMarket(state);
      const commList = market.commodities || [];
      const stocksList = market.stocks || [];
      const inflationRate = (state.globalInflation || 2.5) / 100;

      // 1. Stochastic Price Ticks for Commodities (z regresją do basePrice)
      for (const item of commList) {
        const reversionGap = item.basePrice - item.currentPrice;
        const reversion = reversionGap * 0.08; // ~8% miesięcznego luku do wartości fundamentalnej
        const drift = item.currentPrice * (inflationRate / 12);
        const noise = item.currentPrice * R.gaussian(0, item.volatility || 0.03);

        let next = item.currentPrice + reversion + drift + noise;
        next = Math.min(item.basePrice * 4.0, Math.max(item.basePrice * 0.35, next));
        item.currentPrice = Math.round(next * 100) / 100;

        if (!item.priceHistory) item.priceHistory = [];
        item.priceHistory.push(item.currentPrice);
        if (item.priceHistory.length > 60) item.priceHistory.shift();
      }

      // 2. Stochastic Price Ticks for Equities (regresja do wartosci bazowej wolno rosnacej inflacja)
      for (const stock of stocksList) {
        if (!stock.baseSharePrice) stock.baseSharePrice = stock.sharePrice;
        const fairValue = stock.baseSharePrice * (1 + inflationRate * (turnNumber / 120));
        const reversion = (fairValue - stock.sharePrice) * 0.05;
        const noise = stock.sharePrice * R.gaussian(0, 0.035);

        let next = stock.sharePrice + reversion + noise;
        next = Math.max(0.5, next);
        stock.sharePrice = Math.round(next * 100) / 100;

        if (!stock.priceHistory) stock.priceHistory = [];
        stock.priceHistory.push(stock.sharePrice);
        if (stock.priceHistory.length > 60) stock.priceHistory.shift();
      }

      // 3. Process Dividends into Sovereign Portfolios
      for (const country of Object.values(state.countries)) {
        if (!country.portfolio?.stocks) continue;
        let totalMonthlyDividend = 0;

        for (const [ticker, shares] of Object.entries(country.portfolio.stocks)) {
          if (shares <= 0) continue;
          const stock = stocksList.find(s => s.ticker === ticker);
          if (stock && stock.dividendYield > 0) {
            const monthlyYieldRate = (stock.dividendYield / 100) / 12;
            const dividendAmount = Math.round(shares * stock.sharePrice * monthlyYieldRate);
            totalMonthlyDividend += dividendAmount;
          }
        }

        if (totalMonthlyDividend > 0) {
          country.treasury += totalMonthlyDividend;
          country.portfolio.monthlyDividends = totalMonthlyDividend;
        }
      }
    }
  };

  window.WorldForge.Systems.Exchange = ExchangeSystem;
})();
