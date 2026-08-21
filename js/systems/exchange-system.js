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
     * Krzywa wpływu zlecenia na rynek (market depth).
     * r = wielkość zlecenia / miesięczna głębokość rynku aktywa.
     * impact ≈ 3.4% przy r=1 (150 t), ~8.6% przy r=2 (300 t, kontagion), ~18% przy r=3.3 (500 t), ~42% przy r=6.7 (zrzut 1000 t).
     */
    computeDepthImpact(item, amount) {
      if (!item || !amount || amount <= 0) return 0;
      const depth = item.marketDepthOz || Math.max(1, 2500000000 / (item.currentPrice || 100));
      const r = amount / depth;
      return Math.min(0.60, 0.025 * r + 0.009 * r * r);
    },

    maxOrderAmount(item) {
      const depth = item.marketDepthOz || Math.max(1, 2500000000 / (item.currentPrice || 100));
      return Math.floor(depth * 2.0); // maks. 2× głębokość na zlecenie — większe wolumeny partiami
    },

    /**
     * Kontagion: duże przemieszczenia złota rozlewają się na skorelowane aktywa
     * (srebro -0.8×, przemysł/miedź -0.25×, akcje -0.4×) — krach na zlocie
     * pociąga cały rynek (risk-off / margin calls), tak jak w realu.
     */
    applyContagion(market, movedPct) {
      const mag = Math.abs(movedPct);
      if (mag < 0.05) return; // ruchy >5% rozlewają się na skorelowane aktywa

      const hit = (id, factor) => {
        const asset = market.commodities.find(a => a.id === id);
        if (!asset) return;
        const minP = (asset.basePrice || asset.currentPrice) * 0.3;
        asset.currentPrice = Math.round(Math.max(minP, asset.currentPrice * (1 + movedPct * factor)) * 100) / 100;
      };

      hit('silver', 0.8);
      hit('copper', 0.25);
      hit('lithium', 0.2);
      hit('crude_oil_brent', 0.15);
      hit('wheat_cbot', 0.05);
      hit('wafers_3nm', 0.1);
      for (const stock of market.stocks) {
        stock.sharePrice = Math.round(Math.max(0.5, stock.sharePrice * (1 + movedPct * 0.4)) * 100) / 100;
      }
    },

    /**
     * Trwała erozja wartości fundamentalnej po zrzucie ponad głębokość rynku:
     * świat ma realnie więcej kruszcu -> kotwica cenowa obniża się na stałe
     * (maks. do 50% pierwotnej wartości fundamentalnej).
     */
    erodeFundamental(item, amount) {
      if (!item || !amount) return;
      const depth = item.marketDepthOz || Math.max(1, 2500000000 / (item.currentPrice || 100));
      const r = amount / depth;
      if (r <= 1) return;
      if (!item.basePrice0) item.basePrice0 = item.basePrice;
      item.basePrice = Math.max(item.basePrice0 * 0.5, item.basePrice * (1 - 0.02 * (r - 1)));
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

      // Limit wolumenu: rynek nie wchłonie wszystkiego jednym zleceniem
      const maxOrder = this.maxOrderAmount(item);
      if (cleanAmount > maxOrder) {
        return { success: false, reason: `Rynek nie wchłonie ${F.number(cleanAmount, { rawText: true })} ${item.unit} jednym zleceniem (maks. ${F.number(maxOrder, { rawText: true })}). Realizuj partiami.` };
      }

      // Cena wykonania z wpływem na rynek (duże zakupu podbijają cenę przeciwko Tobie)
      const impact = this.computeDepthImpact(item, cleanAmount);
      const execPrice = item.currentPrice * (1 + impact);
      const totalCost = Math.round(cleanAmount * execPrice);
      if (country.treasury < totalCost) {
        return { success: false, reason: `Brak wystarczających środków w Skarbie Państwa (wymagane ${F.money(totalCost, 'USD')})` };
      }

      country.treasury -= totalCost;
      if (!country.portfolio) country.portfolio = { commodities: {}, stocks: {}, totalInvested: 0, monthlyDividends: 0 };
      if (!country.portfolio.commodities) country.portfolio.commodities = {};

      const currentQty = country.portfolio.commodities[commodityId] || 0;
      country.portfolio.commodities[commodityId] = currentQty + cleanAmount;

      const movedPct = impact;
      item.currentPrice = Math.round(execPrice * 100) / 100;
      this.applyContagion(this.getMarket(window.WorldForge.Core.GameState.getState()), movedPct);
      this.erodeFundamental(item, cleanAmount);

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

      // Limit wolumenu: rynek nie wchłonie wszystkiego jednym zleceniem
      const maxOrder = this.maxOrderAmount(item);
      if (cleanAmount > maxOrder) {
        return { success: false, reason: `Rynek nie wchłonie ${F.number(cleanAmount, { rawText: true })} ${item.unit} jednym zleceniem (maks. ${F.number(maxOrder, { rawText: true })}). Sprzedawaj partiami albo w kontraktach.` };
      }

      const impact = this.computeDepthImpact(item, cleanAmount);
      const execPrice = item.currentPrice * (1 - impact);
      const totalProceeds = Math.round(cleanAmount * execPrice);
      country.treasury += totalProceeds;
      country.portfolio.commodities[commodityId] -= cleanAmount;

      // Tracker wyprzedaży rezerw (okno 12 m-cy) — zasilanie modułu ostrzeżeń
      if (commodityId === 'gold' && country.portfolio) {
        country.portfolio.goldSoldLast12mOz = (country.portfolio.goldSoldLast12mOz || 0) + cleanAmount;
      }

      // Impact: sprzedaż zbija cenę; duże zrzuty rozleją się na cały rynek
      const movedPct = -impact;
      item.currentPrice = Math.max((item.basePrice0 || item.basePrice) * 0.25, Math.round(execPrice * 100) / 100);
      this.applyContagion(this.getMarket(window.WorldForge.Core.GameState.getState()), movedPct);
      this.erodeFundamental(item, cleanAmount);

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
      // 4. Rotacja okna 12-miesięcznego wyprzedaży rezerw (dla kryzysów walutowych)
      for (const country of Object.values(state.countries)) {
        if (country.portfolio?.goldSoldLast12mOz > 0) {
          country.portfolio.goldSoldLast12mOz = Math.round(country.portfolio.goldSoldLast12mOz * (11 / 12));
        }
      }

      // 5. Presja podaży górniczej: jeśli świat wydobywa więcej niż historyczne
      // ~306 t/mies. (rekord 2025: 3 672 t/rok), nadwyżka trwale eroduje wartość
      // fundamentalną złota — masowe kopalnie działają przeciw swoim właścicielom.
      const goldItem = market.commodities.find(c => c.id === 'gold');
      if (goldItem) {
        let worldMonthlyTonnes = 0;
        for (const country of Object.values(state.countries)) {
          for (const fac of (country.factories || [])) {
            if (fac.isMine && fac.status === 'ACTIVE') {
              worldMonthlyTonnes += (fac.capacityBoost / 12) * 0.78;
            }
          }
        }
        const baseline = (window.WorldForge.Data.GoldReserves?.world?.monthlyProductionTonnes) || 306;
        if (worldMonthlyTonnes > baseline && goldItem.basePrice0) {
          const excessRatio = (worldMonthlyTonnes - baseline) / baseline;
          goldItem.basePrice = Math.max(
            goldItem.basePrice0 * 0.5,
            goldItem.basePrice * (1 - Math.min(0.05, excessRatio * 0.012))
          );
        }
      }
    }
  };

  window.WorldForge.Systems.Exchange = ExchangeSystem;
})();
