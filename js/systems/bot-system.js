/**
 * WorldForge: Nations - Bot Strategic AI System v2
 *
 * Autonomiczne państwa AI prowadzą PEŁNĄ politykę gospodarczo-strategiczną:
 *  1. Płynność skarbca (emisje obligacji, wyprzedaż rezerw w kryzysie, wykup długu)
 *  2. Polityka fiskalna (korekty podatków i wydatków wg archetypu)
 *  3. Bank centralny (reguła Taylora względem celu inflacyjnego kraju)
 *  4. Przemysł (budowa i modernizacja fabryk, państwowych i prywatnych)
 *  5. Handel spot (sprzedaż nadwyżek / zakup niedoborów — realny wpływ na ceny światowe)
 *  6. Umowy bilateralne bot<->bot (dopasowanie eksporterów do importerów)
 *  7. OFERTY dla gracza (boty skupują Twoje nadwyżki i proponują swoje)
 *  8. Portfel giełdowy (złoto, akcje z dywidendą, wyprzedaż w kryzysie)
 *  9. Dyplomacja (ocieplanie relacji, pomoc sojusznikom)
 * 10. Badania (dobór technologii wg archetypu)
 * 11. Megaprojekty (bogate mocarstwa)
 * 12. Ratowanie banków (dokapitalizowanie przy realnych kwotach)
 *
 * Zasady: boty działają WYŁĄCZNIE przez oficjalne systemy i komendy (bez oszustw),
 * nie przekraczają limitów gracza i podlegają tym samym regułom rynku.
 * Wydajność: mocarstwa grają co turę, reszta świata rotacyjnie (co 3 tury).
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const BotSystem = {
    MAJOR_POWER_COUNT: 20,      // top GDP działa co turę
    MINOR_ACT_EVERY: 3,         // pozostałe co 3 tury (rotacyjnie)
    MAX_FACTORIES_BASE: 8,      // limit fabryk na bota (chroni rozmiar zapisu)
    MAX_DEALS_PER_BOT: 3,       // limit aktywnych umów bilateralnych bota
    MAX_ACTIVE_OFFERS: 8,       // limit ofert oczekujących na gracza
    OFFER_TTL_TURNS: 4,         // oferta wygasa po 4 turach

    /** Mapowanie archetypu -> preferencje */
    ARCHETYPE_PROFILES: {
      'Potęga militarna': { factorySectors: ['military_equipment', 'machinery', 'steel'], fiscalStyle: 'hawk', buyGold: 0.4 },
      'Centrum technologiczne': { factorySectors: ['semiconductors', 'electronics', 'machinery'], fiscalStyle: 'technocrat', buyGold: 0.2 },
      'Zielona transformacja': { factorySectors: ['electronics', 'machinery', 'aluminum'], fiscalStyle: 'green', buyGold: 0.15 },
      'Mocarstwo surowcowe': { factorySectors: ['fuels', 'steel', 'aluminum'], fiscalStyle: 'extractive', buyGold: 0.6 },
      'Tygrys eksportowy': { factorySectors: ['electronics', 'vehicles', 'machinery'], fiscalStyle: 'technocrat', buyGold: 0.25 },
      'Państwo socjalne': { factorySectors: ['medicine', 'consumer_goods', 'machinery'], fiscalStyle: 'populist', buyGold: 0.2 },
      'Rynek wschodzący': { factorySectors: ['food', 'steel', 'consumer_goods'], fiscalStyle: 'pragmatist', buyGold: 0.3 },
      'Cautious Balance': { factorySectors: ['machinery', 'medicine', 'food'], fiscalStyle: 'pragmatist', buyGold: 0.3 },
      'Państwo autorytarne': { factorySectors: ['military_equipment', 'steel', 'fuels'], fiscalStyle: 'hawk', buyGold: 0.5 }
    },

    _roll(seed) {
      let x = (seed * 2654435761) >>> 0;
      x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
      return (x >>> 0) / 4294967296;
    },

    hashOf(id) {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
      return h;
    },

    rngFor(countryId, turn, salt) {
      // Deterministyczny pseudo-losowy [0,1) per (kraj, tura, sól)
      let x = (this.hashOf(countryId + ':' + salt) * 2654435761 + turn * 40503) >>> 0;
      x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
      return (x >>> 0) / 4294967296;
    },

    /**
     * Główna pętla AI na turę.
     */
    processAllBots(state, turnNumber) {
      const playerCountryId = state.playerCountryId;

      // Lista mocarstw (top GDP) — cache co turę (tanie)
      const majors = this.computeMajorPowers(state);

      if (!Array.isArray(state.incomingOffers)) state.incomingOffers = [];
      // Usuń wygasłe oferty dla gracza
      state.incomingOffers = state.incomingOffers.filter(o => o.expiresAtTurn > turnNumber);

      let botNewsBudget = 2; // maks. 2 newsy z aktywności botów na turę

      for (const [countryId, country] of Object.entries(state.countries)) {
        if (countryId === playerCountryId) continue;

        const isMajor = majors.has(countryId);
        // Rotacja mniejszych państw — wydajność
        if (!isMajor && ((turnNumber + this.hashOf(countryId)) % this.MINOR_ACT_EVERY) !== 0) continue;

        try {
          this.runBot(state, country, turnNumber, isMajor, majors, () => botNewsBudget > 0 && botNewsBudget--);
        } catch (err) {
          console.error(`[BotSystem] Błąd bota ${countryId}:`, err);
        }
      }

      // Oferty handlowe dla gracza generuje osobny pas (raz na turę, po decyzjach botów)
      this.generatePlayerOffers(state, turnNumber, majors);
    },

    computeMajorPowers(state) {
      const entries = Object.values(state.countries)
        .filter(c => c.id !== state.playerCountryId)
        .sort((a, b) => (b.economy?.gdpNominal || 0) - (a.economy?.gdpNominal || 0));
      const set = new Set();
      for (let i = 0; i < Math.min(this.MAJOR_POWER_COUNT, entries.length); i++) set.add(entries[i].id);
      return set;
    },

    memory(country) {
      if (!country.botMemory) {
        country.botMemory = { lastBond: -99, lastFactory: -99, lastUpgrade: -99, lastFiscal: -99, lastOffer: -99, lastPortfolio: -99 };
      }
      return country.botMemory;
    },

    /** Pojedynczy bot — pełne drzewo decyzyjne */
    runBot(state, country, turnNumber, isMajor, majors, spendNews) {
      const Commands = window.WorldForge.Core.Commands;
      const eco = country.economy;
      const budget = country.budget;
      const monthlyGdp = eco.gdpNominal / 12;
      const monthlyRevenue = budget.revenues?.total || Math.round(monthlyGdp * 0.33);
      const mem = this.memory(country);
      const profile = this.ARCHETYPE_PROFILES[country.botArchetype] || this.ARCHETYPE_PROFILES['Cautious Balance'];
      const roll = (salt) => this.rngFor(country.id, turnNumber, salt);
      const dispatch = (type, payload) => Commands.dispatch({ type, countryId: country.id, payload }, { silent: true });

      // ── 1. PŁYNNOŚĆ SKARBU ─────────────────────────────────────────
      if (country.treasury < monthlyRevenue * 0.75) {
        // Kryzys: najpierw wyprzedaż rezerw giełdowych
        if (country.portfolio?.commodities) {
          for (const [cid, qty] of Object.entries(country.portfolio.commodities)) {
            if (qty > 0 && country.treasury < monthlyRevenue) {
              window.WorldForge.Systems.Exchange.sellCommodity(country, cid, qty);
            }
          }
        }
        // Potem emisja obligacji pokrywająca ~5 miesięcy deficytu (min 1.5% PKB).
        // Rzadziej, ale większe emisje = mniej pojedynczych bondów w stanie gry.
        if (turnNumber - mem.lastBond >= 6) {
          const deficit = Math.max(0, -budget.balanceMonthly);
          const amount = Math.max(Math.round(eco.gdpNominal * 0.015), Math.round(deficit * 5));
          dispatch('ISSUE_BONDS', { amount, maturityMonths: 60, currency: country.currency, bondType: 'Deficit Refinancing' });
          mem.lastBond = turnNumber;
        }
      } else if (
        country.treasury > eco.gdpNominal * 0.18 &&
        country.debt.debtToGdp > 45 &&
        roll('buyback') < 0.25
      ) {
        dispatch('BUYBACK_BONDS', { amount: Math.round(eco.gdpNominal * 0.008) });
      }

      // ── 2. POLITYKA FISKALNA (co 6 tur) ───────────────────────────
      if (turnNumber - mem.lastFiscal >= 6) {
        mem.lastFiscal = turnNumber;
        const annualBalancePct = (budget.balanceMonthly * 12) / Math.max(1, eco.gdpNominal);
        const spending = budget.spending;

        if (annualBalancePct < -0.05) {
          // Duży deficyt — styl zależy od archetypu
          if (profile.fiscalStyle === 'populist') {
            if (country.taxes.pitRate < 40) dispatch('SET_TAX_RATE', { taxType: 'pitRate', rate: Math.min(40, country.taxes.pitRate + 0.5) });
          } else if (profile.fiscalStyle === 'hawk') {
            const cut = Math.max(3, (spending.socialWelfare || 10) * 0.9);
            dispatch('SET_BUDGET', { category: 'socialWelfare', value: Math.round(cut * 10) / 10 });
          } else {
            const cut = Math.max(1, (spending.subsidies || 2) * 0.8);
            dispatch('SET_BUDGET', { category: 'subsidies', value: Math.round(cut * 10) / 10 });
          }
        } else if (annualBalancePct > 0.025 && roll('taxcut') < 0.5) {
          // Nadwyżka — ulga podatkowa lub inwestycja społeczna
          if (profile.fiscalStyle === 'populist') {
            dispatch('SET_BUDGET', { category: 'health', value: Math.min(25, (spending.health || 16) * 1.06) });
          } else if (country.taxes.citRate > 12) {
            dispatch('SET_TAX_RATE', { taxType: 'citRate', rate: Math.max(12, country.taxes.citRate - 0.5) });
          }
        }
      }

      // ── 3. BANK CENTRALNY (reguła Taylora) ─────────────────────────
      const cb = country.centralBank;
      if ((!country.monetaryUnion || country.isUnionLeader) && cb) {
        const target = cb.inflationTarget || 3.0;
        const gap = eco.inflation - target;
        if (gap > 1.5 && cb.baseRate < 22.0) {
          dispatch('SET_CENTRAL_BANK_RATE', { rate: Math.min(22.0, cb.baseRate + 0.5) });
        } else if (gap < -0.5 && eco.gdpGrowthYoY < 2.0 && cb.baseRate > 1.0) {
          dispatch('SET_CENTRAL_BANK_RATE', { rate: Math.max(0.5, cb.baseRate - 0.25) });
        } else if (Math.abs(gap) <= 0.5 && cb.baseRate > 3.75) {
          dispatch('SET_CENTRAL_BANK_RATE', { rate: Math.max(3.0, cb.baseRate - 0.25) });
        }
      }

      // ── 4. PRZEMYSŁ: budowa i modernizacja fabryk ──────────────────
      const factoryTypes = window.WorldForge.Data.FactoryTypes || [];
      const factories = country.factories || [];
      const factoryCap = Math.min(this.MAX_FACTORIES_BASE, Math.max(1, Math.round(eco.gdpNominal / 300000000000)));
      const buildProb = isMajor ? 0.30 : 0.10;

      if (
        factories.length < factoryCap &&
        roll('build') < buildProb &&
        turnNumber - mem.lastFactory >= 10
      ) {
        const candidates = factoryTypes.filter(ft => profile.factorySectors.includes(ft.sector));
        const pick = (candidates.length > 0 ? candidates : factoryTypes)[Math.floor(roll('buildpick') * (candidates.length > 0 ? candidates.length : factoryTypes.length))];
        if (pick) {
          const ownership = (profile.fiscalStyle === 'technocrat' || profile.fiscalStyle === 'pragmatist') && roll('own') < 0.5 ? 'PRIVATE' : 'STATE';
          const res = dispatch('BUILD_FACTORY', { factoryTypeId: pick.id, ownership });
          if (res.success) {
            mem.lastFactory = turnNumber;
            if (isMajor && spendNews()) {
              window.WorldForge.Core.GameState.addNotification(
                'info',
                '🤖 Aktywność Świata',
                `${country.flag || ''} ${country.namePl} rozpoczyna budowę: ${pick.name}${ownership === 'STATE' ? ' (zakład państwowy)' : ' (prywatna inwestycja)'}.`,
                state.playerCountryId
              );
            }
          }
        }
      } else if (
        factories.length > 0 &&
        roll('upgrade') < 0.12 &&
        turnNumber - mem.lastUpgrade >= 9
      ) {
        const upgradable = factories.filter(f => f.status === 'ACTIVE' && f.level < 5);
        if (upgradable.length > 0) {
          const fac = upgradable[Math.floor(roll('uppick') * upgradable.length)];
          const cost = Math.round(300000000 * Math.pow(1.5, fac.level - 1));
          if (country.treasury > cost * 2.5) {
            const res = dispatch('EXPAND_FACTORY', { factoryId: fac.id });
            if (res.success) mem.lastUpgrade = turnNumber;
          }
        }
      }

      // ── 5. HANDEL SPOT: sprzedaż nadwyżek, zakup niedoborów ───────
      this.botSpotTrade(state, country, monthlyRevenue, roll);

      // ── 6. UMOWY BILATERALNE bot<->bot ─────────────────────────────
      this.botBilateralTrade(state, country, turnNumber, roll);

      // ── 7. PORTEFEL GIEŁDOWY: złoto i akcje z dywidendą ─────────────
      if (turnNumber - mem.lastPortfolio >= 6 && roll('gold') < (profile.buyGold || 0.25)) {
        mem.lastPortfolio = turnNumber;
        if (country.treasury > eco.gdpNominal * 0.12) {
          // Złoto jako rezerwa (0.2% - 0.8% PKB)
          const goldBudget = Math.round(eco.gdpNominal * (0.002 + roll('goldamt') * 0.006));
          window.WorldForge.Systems.Exchange.buyCommodity(country, 'gold', Math.max(100, Math.floor(goldBudget / 2450)));
        } else if (roll('stock') < 0.4 && country.treasury > eco.gdpNominal * 0.08) {
          // Akcje płacące dywidendę
          const market = window.WorldForge.Core.GameState.getExchangeMarket();
          const dividendStocks = (market.stocks || []).filter(s => (s.dividendYield || 0) > 2.0);
          if (dividendStocks.length > 0) {
            const stock = dividendStocks[Math.floor(roll('stockpick') * dividendStocks.length)];
            const budget = Math.round(eco.gdpNominal * 0.002);
            const shares = Math.max(1, Math.floor(budget / stock.sharePrice));
            window.WorldForge.Systems.Exchange.buyStock(country, stock.ticker, shares);
          }
        }
      }

      // ── 8. DYPLOMACJA i pomoc ──────────────────────────────────────
      if (roll('diplo') < 0.08) {
        const relations = country.diplomacy?.relations || {};
        const friendIds = Object.entries(relations)
          .filter(([id, score]) => id !== country.id && score > 20 && state.countries[id])
          .sort((a, b) => b[1] - a[1]);
        if (friendIds.length > 0) {
          dispatch('DIPLOMATIC_ACTION', { action: 'IMPROVE_RELATIONS', targetId: friendIds[0][0] });
          // Bogate mocarstwa wspierają sojuszników w kryzysie
          if (isMajor && country.treasury > eco.gdpNominal * 0.10 && roll('aid') < 0.25) {
            const friend = state.countries[friendIds[0][0]];
            if (friend && friend.treasury < friend.economy.gdpNominal * 0.005) {
              dispatch('TRANSFER_FUNDS', { targetCountryId: friend.id, amount: Math.round(eco.gdpNominal * 0.0005) });
            }
          }
        }
      }

      // ── 9. BADANIA ─────────────────────────────────────────────────
      if (country.research && !country.research.activeTechId) {
        const allTechs = window.WorldForge.Data.Technologies || [];
        const available = allTechs.filter(t => {
          if (country.research.unlockedTechs.includes(t.id)) return false;
          if (t.prerequisites && t.prerequisites.length > 0) {
            return t.prerequisites.every(p => country.research.unlockedTechs.includes(p));
          }
          return true;
        });
        if (available.length > 0) {
          let chosenTech = available[Math.floor(roll('tech') * available.length)];
          const bySector = (branches) => available.find(t => branches.includes(t.branch));
          if (country.botArchetype === 'Potęga militarna') chosenTech = bySector(['defense']) || chosenTech;
          else if (country.botArchetype === 'Zielona transformacja') chosenTech = bySector(['energy']) || chosenTech;
          else if (country.botArchetype === 'Centrum technologiczne') chosenTech = bySector(['digital', 'banking']) || chosenTech;
          dispatch('START_RESEARCH', { techId: chosenTech.id });
        }
      }

      // ── 10. MEGAPROJEKTY (bogate mocarstwa) ────────────────────────
      if (isMajor && roll('proj') < 0.10 && country.projects && country.projects.active.length === 0) {
        const allProjects = window.WorldForge.Data.Projects || [];
        const candidate = allProjects.find(p =>
          !country.projects.completed.some(c => c.id === p.id) &&
          country.treasury > p.totalCost * 0.3 &&
          (budget.balanceMonthly * 12) / eco.gdpNominal > -0.03
        );
        if (candidate) {
          const res = dispatch('START_PROJECT', { projectId: candidate.id });
          if (res.success && spendNews()) {
            window.WorldForge.Core.GameState.addNotification(
              'info', '🤖 Aktywność Świata',
              `${country.flag || ''} ${country.namePl} uruchamia megaprojekt: ${candidate.name}.`,
              state.playerCountryId
            );
          }
        }
      }

      // ── 11. RATOWANIE BANKÓW (realne kwoty) ────────────────────────
      if (country.commercialBanks) {
        for (const bank of country.commercialBanks) {
          const bailoutCost = Math.round(eco.gdpNominal * 0.004);
          if (bank.carSolvencyRatio < 8.5 && country.treasury > bailoutCost * 2) {
            dispatch('BAILOUT_BANK', { bankId: bank.id, amount: bailoutCost });
            break;
          }
        }
      }
    },

    /** Handel spot bota: zrzuca nadwyżki (do 10% zapasu nad buforem), kupuje niedobory */
    botSpotTrade(state, country, monthlyRevenue, roll) {
      const Trade = window.WorldForge.Systems.Trade;
      const production = country.production;
      if (!production || country.treasury < monthlyRevenue * 0.5) return;

      for (const [resId, item] of Object.entries(production)) {
        if (!item || !isFinite(item.stockpile)) continue;
        const buffer = (item.consumption || 0) * 4; // 4-miesięczny bufor bezpieczeństwa

        // Sprzedaż nadwyżki powyżej bufora (maks 10% zapasu na zlecenie)
        if (item.stockpile > buffer * 1.2 && item.stockpile > 2000 && roll('sell' + resId) < 0.5) {
          const surplusAboveBuffer = item.stockpile - buffer;
          const amount = Math.max(500, Math.floor(Math.min(surplusAboveBuffer, item.stockpile * 0.1)));
          Trade.executeMarketTrade(state, country.id, { resourceId: resId, action: 'SELL', amount });
        }
        // Zakup krytycznego niedoboru (energia/żywność)
        else if (
          (resId === 'energy' || resId === 'food') &&
          item.stockpile < (item.consumption || 1) * 0.8 &&
          country.treasury > monthlyRevenue * 2.5 &&
          roll('buy' + resId) < 0.6
        ) {
          const amount = Math.min(Math.floor((item.consumption || 1000) * 0.6), 150000);
          Trade.executeMarketTrade(state, country.id, { resourceId: resId, action: 'BUY', amount });
        }
      }
    },

    /** Umowy bilateralne bot<->bot: eksporter z nadwyżką <-> importer z deficytem */
    botBilateralTrade(state, country, turnNumber, roll) {
      if (roll('deal') > 0.22) return;
      const Trade = window.WorldForge.Systems.Trade;
      if (!state.bilateralDeals) state.bilateralDeals = [];
      const myDeals = state.bilateralDeals.filter(d => d.exporterId === country.id || d.importerId === country.id);
      if (myDeals.length >= this.MAX_DEALS_PER_BOT) return;

      // Znajdź mój sektor z największą nadwyżką
      // (woda pominięta: jej zapasy są bezpośrednio konsumowane przez produkcję
      // żywności jako input, więc kontrakty na wodę notorycznie się wyrywały)
      const production = country.production || {};
      let bestRes = null, bestSurplus = 0;
      for (const [resId, item] of Object.entries(production)) {
        if (resId === 'water') continue;
        const surplus = (item.output || 0) - (item.consumption || 0);
        if (surplus > bestSurplus && item.stockpile > surplus) { bestSurplus = surplus; bestRes = resId; }
      }
      if (!bestRes || bestSurplus < 300) return;

      const spot = state.globalMarket.prices[bestRes] || 150;
      const price = Math.round(spot * (0.92 + roll('dealprice') * 0.18) * 10) / 10;
      const unitCost = price * 1000;
      // Bufor bezpieczeństwa eksportera: zapas musi pokryć 4 miesiące dostaw
      // (chromi to mikro-państwa z rzekim buforem — ich kontrakty się wyrywały)
      if (production[bestRes].stockpile < Math.floor(bestSurplus * 0.35) * 4) return;

      // Dobierz importera: kraj z deficytem LUB zasiliający rezerwy strategiczne
      // (zapas < 6 miesięcy konsumpcji), bez aktywnej umowy na ten surowiec.
      // Relacje dyplomatyczne muszą pozwalać na współpracę.
      const candidates = Object.values(state.countries).filter(c => {
        if (c.id === country.id || c.id === state.playerCountryId) return false;
        const item = c.production?.[bestRes];
        if (!item) return false;
        const hasDeficit = (item.consumption || 0) > (item.output || 0);
        const lowReserve = (item.stockpile || 0) < (item.consumption || 1) * 6;
        if (!hasDeficit && !lowReserve) return false;
        const alreadyImporting = (state.bilateralDeals || []).some(d => d.importerId === c.id && d.resourceId === bestRes);
        if (alreadyImporting) return false;
        return ((country.diplomacy?.relations?.[c.id] ?? 0) > -20);
      });
      if (candidates.length === 0) return;
      const importer = candidates[Math.floor(roll('dealpick') * candidates.length)];

      const importerRevenue = importer.budget?.revenues?.total || 0;
      const budgetCapUnits = Math.floor((importerRevenue * 0.08) / unitCost);
      const reserveCapUnits = Math.floor(importer.treasury / unitCost);
      const wantUnits = Math.floor(bestSurplus * 0.35);
      const monthlyAmount = Math.min(wantUnits, Math.max(budgetCapUnits, 1), Math.max(reserveCapUnits, 1));
      if (monthlyAmount < 100) return;

      Trade.proposeBilateralDeal(state, country.id, {
        importerId: importer.id,
        resourceId: bestRes,
        monthlyAmount,
        agreedPrice: price,
        durationMonths: 6 + Math.floor(roll('dealdur') * 18)
      }, turnNumber);
    },

    /**
     * Oferty handlowe kierowane DO GRACZA (mocarstwa, max 1 nowa na turę świata).
     * Kierunek IMPORT = bot chce KUPIC od gracza (premium dla Ciebie).
     * Kierunek EXPORT = bot chce SPRZEDAC graczowi (okazja taniego surowca).
     */
    generatePlayerOffers(state, turnNumber, majors) {
      if (this._roll(turnNumber * 31 + 7) > 0.25) return; // większość tur generuje próbę
      const player = state.countries[state.playerCountryId];
      if (!player) return;
      if (!Array.isArray(state.incomingOffers)) state.incomingOffers = [];
      if (state.incomingOffers.length >= this.MAX_ACTIVE_OFFERS) return;

      const rollWorld = (salt) => this._roll(turnNumber * 48271 + salt);
      const candidates = [...majors].map(id => state.countries[id]).filter(Boolean);
      if (candidates.length === 0) return;
      const bot = candidates[Math.floor(rollWorld(7) * candidates.length)];

      // Kierunek 1: bot kupuje nadwyżkę gracza (cena premium 105-115% spot)
      const playerSurpluses = Object.entries(player.production || {})
        .filter(([, it]) => it.stockpile > (it.consumption || 0) * 3 && it.stockpile > 3000)
        .sort((a, b) => b[1].stockpile - a[1].stockpile);
      const botNeeds = (resId) => bot.production?.[resId] && bot.production[resId].consumption > bot.production[resId].output;

      if (playerSurpluses.length > 0 && bot.treasury > bot.economy.gdpNominal * 0.005) {
        const pick = playerSurpluses.find(([resId]) => botNeeds(resId)) || playerSurpluses[0];
        const spot = state.globalMarket.prices[pick[0]] || 150;
        const amount = Math.max(100, Math.floor(Math.min(pick[1].stockpile * 0.25, pick[1].output * 0.5) || 500));
        if (amount >= 100 && bot.treasury > amount * spot * 1000 * 3) {
          const offer = {
            id: 'offer_' + turnNumber + '_' + Math.floor(rollWorld(13) * 1e6),
            fromCountryId: bot.id,
            direction: 'IMPORT', // bot importuje (= kupuje od Ciebie)
            resourceId: pick[0],
            monthlyAmount: amount,
            price: Math.round(spot * (1.05 + rollWorld(29) * 0.10) * 10) / 10,
            durationMonths: 6 + Math.floor(rollWorld(31) * 18),
            expiresAtTurn: turnNumber + this.OFFER_TTL_TURNS,
            createdTurn: turnNumber
          };
          state.incomingOffers.push(offer);
          window.WorldForge.Core.GameState.addNotification(
            'info', '🤝 Oferta Handlowa od Państwa',
            `${bot.flag || ''} ${bot.namePl} chce KUPOWAĆ od Ciebie ${amount.toLocaleString('pl-PL')} jedn. ${pick[0]}/m-c po $${offer.price}/jedn. przez ${offer.durationMonths} m-cy (cena spot: $${spot.toFixed(1)}). Zdecyduj w zakładce Handel.`,
            state.playerCountryId
          );
          return;
        }
      }

      // Kierunek 2: bot sprzedaje swoją nadwyżkę graczowi (rabat 88-98% spot)
      {
        const botSurpluses = Object.entries(bot.production || {})
          .filter(([, it]) => (it.output || 0) - (it.consumption || 0) > 400 && it.stockpile > 1000)
          .sort((a, b) => (b[1].output - b[1].consumption) - (a[1].output - a[1].consumption));
        if (botSurpluses.length > 0) {
          const pick = botSurpluses[0];
          const spot = state.globalMarket.prices[pick[0]] || 150;
          const surplus = pick[1].output - pick[1].consumption;
          const offer = {
            id: 'offer_' + turnNumber + '_' + Math.floor(rollWorld(17) * 1e6),
            fromCountryId: bot.id,
            direction: 'EXPORT', // bot eksportuje (= sprzedaje Tobie)
            resourceId: pick[0],
            monthlyAmount: Math.max(100, Math.floor(surplus * 0.4)),
            price: Math.round(spot * (0.88 + rollWorld(37) * 0.10) * 10) / 10,
            durationMonths: 6 + Math.floor(rollWorld(41) * 12),
            expiresAtTurn: turnNumber + this.OFFER_TTL_TURNS,
            createdTurn: turnNumber
          };
          state.incomingOffers.push(offer);
          window.WorldForge.Core.GameState.addNotification(
            'info', '🤝 Oferta Handlowa od Państwa',
            `${bot.flag || ''} ${bot.namePl} oferuje Ci dostawy ${offer.monthlyAmount.toLocaleString('pl-PL')} jedn. ${pick[0]}/m-c po $${offer.price}/jedn. przez ${offer.durationMonths} m-cy (cena spot: $${spot.toFixed(1)}) — poniżej rynku. Zdecyduj w zakładce Handel.`,
            state.playerCountryId
          );
        }
      }
    }
  };

  window.WorldForge.Systems.Bot = BotSystem;
})();
