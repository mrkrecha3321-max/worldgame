/**
 * WorldForge: Nations - Central Command System
 * Authoritative command dispatcher for player and bot strategic actions.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  class CommandSystem {
    constructor() {
      this.handlers = new Map();
      this.history = [];
      this.listeners = [];
      this.registerDefaultHandlers();
    }

    registerHandler(type, handlerFn, validatorFn = null) {
      this.handlers.set(type, {
        execute: handlerFn,
        validate: validatorFn || (() => true)
      });
    }

    dispatch(command) {
      if (!command || !command.type) {
        return { success: false, reason: 'Nieprawidłowa struktura komendy: brak type' };
      }

      // If in multiplayer mode, forward command to network server
      if (window.WorldForge.Network && window.WorldForge.Network.isMultiplayer) {
        window.WorldForge.Network.sendCommand(command);
      }

      const handlerEntry = this.handlers.get(command.type);
      if (!handlerEntry) {
        console.warn(`[CommandSystem] Brak handlera dla komendy "${command.type}"`);
        return { success: false, reason: `Nieznany typ komendy: ${command.type}` };
      }

      const state = window.WorldForge.Core.GameState ? window.WorldForge.Core.GameState.getState() : null;
      if (!state) {
        return { success: false, reason: 'Stan gry nie został zainicjalizowany' };
      }

      const countryId = command.countryId;
      if (!countryId || !state.countries[countryId]) {
        return { success: false, reason: `Nieprawidłowy identyfikator państwa "${countryId}"` };
      }

      const validationResult = handlerEntry.validate(state, command.payload, countryId);
      if (validationResult !== true) {
        const msg = typeof validationResult === 'string' ? validationResult : 'Walidacja komendy nie powiodła się';
        return { success: false, reason: msg };
      }

      const turn = state.time.currentTurn || 1;
      const cmdRecord = {
        id: 'cmd_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        type: command.type,
        countryId,
        payload: JSON.parse(JSON.stringify(command.payload || {})),
        turn,
        timestamp: Date.now(),
        success: false,
        result: null
      };

      try {
        const execResult = handlerEntry.execute(state, command.payload, countryId, turn);
        cmdRecord.success = !!(execResult && execResult.success);
        cmdRecord.result = execResult;
        
        if (cmdRecord.success) {
          this.history.push(cmdRecord);
          if (this.history.length > window.WorldForge.CONFIG.MAX_COMMAND_HISTORY) {
            this.history.shift();
          }
          this.emit('commandExecuted', cmdRecord);
        }

        return {
          success: cmdRecord.success,
          reason: execResult ? execResult.reason : 'Błąd wykonania',
          result: execResult ? execResult.data : null,
          commandId: cmdRecord.id
        };
      } catch (err) {
        console.error(`[CommandSystem] Błąd podczas wykonywania komendy ${command.type}:`, err);
        return { success: false, reason: err.message };
      }
    }

    on(event, callback) {
      this.listeners.push({ event, callback });
    }

    emit(event, data) {
      for (const listener of this.listeners) {
        if (listener.event === event) {
          try {
            listener.callback(data);
          } catch (e) {
            console.error(`[CommandSystem] Błąd listenera:`, e);
          }
        }
      }
    }

    registerDefaultHandlers() {
      const V = window.WorldForge.Core.Validators;
      const F = window.WorldForge.Format;

      // 1. Budget category adjustment
      this.registerHandler('SET_BUDGET', (state, payload, countryId) => {
        const country = state.countries[countryId];
        const { category, value } = payload;
        if (!country.budget?.spending || typeof country.budget.spending[category] === 'undefined') {
          return { success: false, reason: `Nieznana kategoria budżetowa "${category}"` };
        }
        const cleanVal = V.clampPercent(value);
        country.budget.spending[category] = cleanVal;
        return { success: true, data: { category, newVal: cleanVal } };
      });

      // 2. Auto-Balance Budget
      this.registerHandler('AUTO_BALANCE_BUDGET', (state, payload, countryId) => {
        const country = state.countries[countryId];
        const spending = country.budget.spending;

        spending.administration = 3.5;
        spending.subsidies = 1.5;
        spending.environment = 1.5;
        spending.publicSafety = 4.0;
        spending.socialWelfare = Math.min(spending.socialWelfare, 10.0);
        spending.infrastructure = Math.min(spending.infrastructure, 8.5);

        if (country.taxes.efficiency < 92) {
          country.taxes.efficiency = Math.min(95, country.taxes.efficiency + 2.0);
        }

        window.WorldForge.Core.GameState.addNotification(
          'info',
          'Zrównoważenie Budżetu Państwa',
          `Zoptymalizowano alokację wydatków publicznych w celu zbliżenia salda do równowagi fiskalnej.`,
          countryId
        );

        return { success: true, data: { status: 'Budget Auto-Balanced' } };
      });

      // 3. Tax rate adjustment
      this.registerHandler('SET_TAX_RATE', (state, payload, countryId) => {
        const country = state.countries[countryId];
        const { taxType, rate } = payload;
        if (!country.taxes || typeof country.taxes[taxType] === 'undefined') {
          return { success: false, reason: `Nieznany typ podatku "${taxType}"` };
        }
        const cleanRate = V.sanitizeNumber(rate, 10, 0, window.WorldForge.CONFIG.MAX_TAX_RATE);
        country.taxes[taxType] = cleanRate;
        return { success: true, data: { taxType, newRate: cleanRate } };
      });

      // 4. Tax Administration Investment
      this.registerHandler('INVEST_TAX_ADMIN', (state, payload, countryId) => {
        const country = state.countries[countryId];
        const { field, amount } = payload;
        const cost = V.clampNonNegative(amount, 100000000);
        if (country.treasury < cost) {
          return { success: false, reason: 'Niewystarczające środki w rezerwach skarbu państwa' };
        }
        country.treasury -= cost;
        if (!country.taxes.investments) country.taxes.investments = { digitalization: 0, antiFraud: 0 };
        country.taxes.investments[field] = (country.taxes.investments[field] || 0) + cost;
        country.taxes.efficiency = Math.min(99, country.taxes.efficiency + 1.2);
        country.taxes.greyEconomyShare = Math.max(3, country.taxes.greyEconomyShare - 0.8);
        return { success: true, data: { field, cost, newEfficiency: country.taxes.efficiency } };
      });

      // 5. Issue Sovereign Bonds
      this.registerHandler('ISSUE_BONDS', (state, payload, countryId, turn) => {
        const country = state.countries[countryId];
        const { amount, maturityMonths, currency, bondType } = payload;
        const cleanAmount = V.clampNonNegative(amount);
        if (cleanAmount <= 0) return { success: false, reason: 'Wartość emisji musi być większa od zera' };

        return window.WorldForge.Systems.Debt.issueBonds(country, cleanAmount, maturityMonths, currency, bondType, turn);
      });

      // 6. Buyback Bonds
      this.registerHandler('BUYBACK_BONDS', (state, payload, countryId) => {
        const country = state.countries[countryId];
        const { bondId, amount } = payload;
        return window.WorldForge.Systems.Debt.buybackBonds(country, bondId, amount);
      });

      // 7. Central Bank Rate
      this.registerHandler('SET_CENTRAL_BANK_RATE', (state, payload, countryId) => {
        const country = state.countries[countryId];
        if (country.monetaryUnion && !country.isUnionLeader) {
          return { success: false, reason: 'Państwo należy do unii walutowej i nie decyduje autonomicznie o stopach procentowych' };
        }
        const { rate } = payload;
        const cleanRate = V.sanitizeNumber(rate, 2.5, window.WorldForge.CONFIG.MIN_INTEREST_RATE, window.WorldForge.CONFIG.MAX_INTEREST_RATE);
        country.centralBank.baseRate = cleanRate;
        return { success: true, data: { newRate: cleanRate } };
      });

      // 8. Central Bank Reserve Requirement
      this.registerHandler('SET_RESERVE_REQUIREMENT', (state, payload, countryId) => {
        const country = state.countries[countryId];
        const { ratio } = payload;
        const cleanRatio = V.clampPercent(ratio, 3.5);
        country.centralBank.reserveRequirement = cleanRatio;
        return { success: true, data: { newRatio: cleanRatio } };
      });

      // 9. Central Bank FX Currency Intervention
      this.registerHandler('CB_FX_INTERVENTION', (state, payload, countryId) => {
        const country = state.countries[countryId];
        if (country.monetaryUnion && !country.isUnionLeader) {
          return { success: false, reason: 'Państwo należy do unii walutowej i nie może prowadzić samodzielnej interwencji walutowej' };
        }

        const { amount, action } = payload;
        const cleanAmount = V.clampNonNegative(amount, 500000000);

        if (action === 'BUY_DOMESTIC') {
          if (country.centralBank.foreignReserves < cleanAmount) {
            return { success: false, reason: `Niewystarczające rezerwy walutowe FX (${F.money(country.centralBank.foreignReserves, 'USD')}) do przeprowadzenia interwencji` };
          }
          country.centralBank.foreignReserves -= cleanAmount;
          const oldFx = country.currencyExchangeRate;
          country.currencyExchangeRate = Math.max(0.0001, country.currencyExchangeRate * 0.965);
          country.economy.inflation = Math.max(0.5, country.economy.inflation - 0.25);

          window.WorldForge.Core.GameState.addNotification(
            'success',
            'Interwencja Walutowa Banku Centralnego',
            `Wykorzystano ${F.money(cleanAmount, 'USD')} rezerw FX. Kurs waluty umocnił się z ${oldFx.toFixed(2)} do ${country.currencyExchangeRate.toFixed(2)} za 1 USD.`,
            countryId
          );

          return { success: true, data: { action, spentFX: cleanAmount, newRate: country.currencyExchangeRate } };
        } else {
          country.centralBank.foreignReserves += cleanAmount * 0.98;
          country.currencyExchangeRate = country.currencyExchangeRate * 1.035;

          window.WorldForge.Core.GameState.addNotification(
            'info',
            'Akumulacja Rezerw Walutowych',
            `Zwiększono rezerwy walutowe o ${F.money(cleanAmount * 0.98, 'USD')}. Kurs waluty dostosowany do ${country.currencyExchangeRate.toFixed(2)} za 1 USD.`,
            countryId
          );

          return { success: true, data: { action, gainedFX: cleanAmount * 0.98, newRate: country.currencyExchangeRate } };
        }
      });

      // 10. Commercial Bank Bailout
      this.registerHandler('BAILOUT_BANK', (state, payload, countryId) => {
        const country = state.countries[countryId];
        const { bankId, amount } = payload;
        const bank = country.commercialBanks.find(b => b.id === bankId);
        if (!bank) return { success: false, reason: 'Nie znaleziono wskazanego banku' };
        
        const cleanAmount = V.clampNonNegative(amount, 500000000);
        if (country.treasury < cleanAmount) {
          return { success: false, reason: 'Brak środków w skarbie państwa na dokapitalizowanie banku' };
        }
        country.treasury -= cleanAmount;
        bank.capital += cleanAmount;
        bank.nplRatio = Math.max(1.0, bank.nplRatio - 2.5);
        bank.status = 'Zdrowy';

        window.WorldForge.Core.GameState.addNotification(
          'info',
          'Dokapitalizowanie Banku Komercyjnego',
          `Przekazano ${F.money(cleanAmount, 'USD')} na kapitał własny banku ${bank.name}. Wskaźnik wypłacalności CAR ustabilizowany.`,
          countryId
        );

        return { success: true, data: { bankName: bank.name, newCapital: bank.capital } };
      });

      // 11. FACTORY SYSTEM: Build new Factory
      this.registerHandler('BUILD_FACTORY', (state, payload, countryId, turn) => {
        const country = state.countries[countryId];
        const factoryTypes = window.WorldForge.Data.FactoryTypes || [];
        const typeMeta = factoryTypes.find(t => t.id === payload.factoryTypeId);

        if (!typeMeta) {
          return { success: false, reason: 'Nie odnaleziono typu fabryki' };
        }

        const cost = typeMeta.cost;
        if (country.treasury < cost) {
          return { success: false, reason: `Niewystarczające środki w Skarbie Państwa (wymagane ${F.money(cost, 'USD')})` };
        }

        country.treasury -= cost;
        if (!country.factories) country.factories = [];

        const newFactory = {
          id: 'fac_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          typeId: typeMeta.id,
          name: payload.customName || typeMeta.name,
          sector: typeMeta.sector,
          capacityBoost: typeMeta.capacityBoost,
          workersEmployed: typeMeta.workersNeeded,
          level: 1,
          status: 'BUILDING',
          remainingMonths: typeMeta.constructionMonths,
          totalConstructionMonths: typeMeta.constructionMonths,
          ownership: payload.ownership || 'STATE', // 'STATE' or 'PRIVATE'
          startedTurn: turn
        };

        country.factories.push(newFactory);

        window.WorldForge.Core.GameState.addNotification(
          'success',
          'Rozpoczęto Budowę Fabryki',
          `Rozpoczęto wznoszenie zakładu: "${newFactory.name}". Planowane oddanie do użytku za ${typeMeta.constructionMonths} miesięcy.`,
          countryId
        );

        return { success: true, data: newFactory };
      });

      // 12. FACTORY SYSTEM: Expand / Upgrade Factory
      this.registerHandler('EXPAND_FACTORY', (state, payload, countryId) => {
        const country = state.countries[countryId];
        if (!country.factories) return { success: false, reason: 'Brak fabryk' };
        const factory = country.factories.find(f => f.id === payload.factoryId);
        if (!factory) return { success: false, reason: 'Nie znaleziono wybranej fabryki' };

        const upgradeCost = Math.round(300000000 * factory.level);
        if (country.treasury < upgradeCost) {
          return { success: false, reason: `Niewystarczające środki na modernizację (${F.money(upgradeCost, 'USD')})` };
        }

        country.treasury -= upgradeCost;
        factory.level += 1;
        factory.capacityBoost = Math.round(factory.capacityBoost * 1.5);
        if (country.production && country.production[factory.sector]) {
          country.production[factory.sector].capacity += Math.round(factory.capacityBoost * 0.5);
        }

        window.WorldForge.Core.GameState.addNotification(
          'info',
          'Modernizacja Zakładu Przemysłowego',
          `Zakład "${factory.name}" został zmodernizowany do poziomu ${factory.level}. Zdolności produkcyjne wzrosły.`,
          countryId
        );

        return { success: true, data: factory };
      });

      // 13. DIRECT MONEY TRANSFER (Send Money to any Country / Player)
      this.registerHandler('TRANSFER_FUNDS', (state, payload, countryId) => {
        const sender = state.countries[countryId];
        const target = state.countries[payload.targetCountryId];
        const amount = V.clampNonNegative(payload.amount);

        if (!sender || !target) return { success: false, reason: 'Nieprawidłowe państwa transakcji' };
        if (countryId === payload.targetCountryId) return { success: false, reason: 'Nie można przelać środków do samego siebie' };

        if (amount <= 0) return { success: false, reason: 'Kwota przelewu musi być większa od zera' };
        if (sender.treasury < amount) {
          return { success: false, reason: `Brak wystarczających środków w Skarbie Państwa (${F.money(sender.treasury, 'USD')})` };
        }

        sender.treasury -= amount;
        target.treasury += amount;

        // Boost bilateral diplomatic relations
        if (sender.diplomacy?.relations[target.id] !== undefined) {
          sender.diplomacy.relations[target.id] = V.clampRelation(sender.diplomacy.relations[target.id] + 8);
        }
        if (target.diplomacy?.relations[sender.id] !== undefined) {
          target.diplomacy.relations[sender.id] = V.clampRelation(target.diplomacy.relations[sender.id] + 12);
        }

        window.WorldForge.Core.GameState.addNotification(
          'success',
          'Międzynarodowy Transfer Finansowy',
          `Przelano ${F.money(amount, 'USD')} do Skarbu Państwa ${target.namePl}.`,
          countryId
        );

        return { success: true, data: { senderId: countryId, targetId: target.id, amount } };
      });

      // 14. SOVEREIGN STATE LOAN (Grant international loan with repayment installments)
      this.registerHandler('OFFER_STATE_LOAN', (state, payload, lenderId, turn) => {
        const lender = state.countries[lenderId];
        const borrower = state.countries[payload.borrowerId];
        const principal = V.clampNonNegative(payload.principal);
        const interestRate = V.sanitizeNumber(payload.interestRate, 4.0, 0.5, 25.0);
        const durationMonths = Math.min(60, Math.max(6, parseInt(payload.durationMonths, 10) || 24));

        if (!lender || !borrower) return { success: false, reason: 'Nieprawidłowe państwa umowy pożyczki' };
        if (lender.treasury < principal) {
          return { success: false, reason: `Lender nie posiada wystarczających rezerw (${F.money(lender.treasury, 'USD')})` };
        }

        lender.treasury -= principal;
        borrower.treasury += principal;

        const loanRecord = {
          id: 'loan_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          lenderId,
          borrowerId: borrower.id,
          principal,
          remainingPrincipal: principal,
          interestRate,
          monthlyInstallment: Math.round((principal / durationMonths) + (principal * (interestRate / 1200))),
          remainingMonths: durationMonths,
          totalDurationMonths: durationMonths,
          startTurn: turn
        };

        if (!state.sovereignLoans) state.sovereignLoans = [];
        state.sovereignLoans.push(loanRecord);

        window.WorldForge.Core.GameState.addNotification(
          'success',
          'Udzielono Pożyczki Międzypaństwowej',
          `Udzielono ${F.money(principal, 'USD')} pożyczki dla ${borrower.namePl} (Oproc: ${interestRate}%, czas: ${durationMonths} m-cy).`,
          lenderId
        );

        return { success: true, data: loanRecord };
      });

      // 15. Research & Megaprojects
      this.registerHandler('START_RESEARCH', (state, payload, countryId) => {
        const country = state.countries[countryId];
        return window.WorldForge.Systems.Research.startTech(country, payload.techId);
      });

      this.registerHandler('START_PROJECT', (state, payload, countryId, turn) => {
        const country = state.countries[countryId];
        return window.WorldForge.Systems.Project.startProject(country, payload.projectId, turn);
      });

      this.registerHandler('CANCEL_PROJECT', (state, payload, countryId) => {
        const country = state.countries[countryId];
        return window.WorldForge.Systems.Project.cancelProject(country, payload.projectId);
      });

      // 16. Trade & Bilateral Deals
      this.registerHandler('EXECUTE_TRADE', (state, payload, countryId) => {
        return window.WorldForge.Systems.Trade.executeMarketTrade(state, countryId, payload);
      });

      this.registerHandler('CREATE_BILATERAL_DEAL', (state, payload, countryId, turn) => {
        return window.WorldForge.Systems.Trade.proposeBilateralDeal(state, countryId, payload, turn);
      });

      this.registerHandler('CANCEL_BILATERAL_DEAL', (state, payload, countryId) => {
        return window.WorldForge.Systems.Trade.cancelBilateralDeal(state, countryId, payload.dealId);
      });

      // 17. Diplomacy & Military
      this.registerHandler('DIPLOMATIC_ACTION', (state, payload, countryId, turn) => {
        return window.WorldForge.Systems.Diplomacy.performAction(state, countryId, payload, turn);
      });

      this.registerHandler('SET_MILITARY_CONFIG', (state, payload, countryId) => {
        const country = state.countries[countryId];
        const { branch, budgetShare } = payload;
        if (country.military?.branches[branch]) {
          country.military.branches[branch].share = V.clampPercent(budgetShare);
        }
        return { success: true, data: { branch, budgetShare } };
      });

      // 18. Event Choice
      this.registerHandler('RESOLVE_EVENT_CHOICE', (state, payload, countryId, turn) => {
        return window.WorldForge.Systems.Event.resolveChoice(state, countryId, payload.eventId, payload.choiceIndex, turn);
      });
    }
  }

  window.WorldForge.Core.Commands = new CommandSystem();
  window.WorldForge.Commands = window.WorldForge.Core.Commands;
})();
