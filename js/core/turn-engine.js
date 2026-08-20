/**
 * WorldForge: Nations - Turn Engine
 * Orchestrates simulation pipelines, sovereign loans settlement, report compilation,
 * state synchronization and auto-saving.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  class TurnEngine {
    constructor() {
      this.timerId = null;
      this.lastTickTime = Date.now();
      this.isProcessingTurn = false;
      this.subscribers = [];
    }

    start() {
      if (this.timerId) return;
      this.lastTickTime = Date.now();
      this.timerId = setInterval(() => this.tick(), 250);
      console.log('[TurnEngine] Silnik symulacji wystartował.');
    }

    stop() {
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    }

    setSpeed(speed) {
      const state = window.WorldForge.Core.GameState.getState();
      if (!state) return;
      state.time.speed = speed;
      state.time.isPaused = (speed === 0);
      this.emit('speedChanged', { speed, isPaused: state.time.isPaused });
    }

    togglePause() {
      const state = window.WorldForge.Core.GameState.getState();
      if (!state) return;
      state.time.isPaused = !state.time.isPaused;
      this.emit('pauseToggled', { isPaused: state.time.isPaused });
    }

    tick() {
      const state = window.WorldForge.Core.GameState.getState();
      if (!state || this.isProcessingTurn) return;

      const now = Date.now();
      const dtMs = now - this.lastTickTime;
      this.lastTickTime = now;

      if (state.time.isPaused || state.time.speed <= 0) {
        return;
      }

      const deltaSeconds = (dtMs / 1000) * state.time.speed;
      state.time.turnProgressSeconds += deltaSeconds;

      const progressRatio = Math.min(1.0, state.time.turnProgressSeconds / state.time.turnDurationSeconds);
      const remainingSeconds = Math.max(0, state.time.turnDurationSeconds - state.time.turnProgressSeconds);

      this.emit('tick', {
        progressRatio,
        progressPercent: progressRatio * 100,
        remainingSeconds: Math.ceil(remainingSeconds),
        turn: state.time.currentTurn
      });

      if (state.time.turnProgressSeconds >= state.time.turnDurationSeconds) {
        this.nextTurn();
      }
    }

    nextTurn() {
      const state = window.WorldForge.Core.GameState.getState();
      if (!state || this.isProcessingTurn) return;

      this.isProcessingTurn = true;
      const turnNumber = state.time.currentTurn;

      try {
        const playerCountryBefore = JSON.parse(JSON.stringify(window.WorldForge.Core.GameState.getPlayerCountry()));

        // 1. Process International Sovereign Loans Repayments
        if (state.sovereignLoans && state.sovereignLoans.length > 0) {
          for (let i = state.sovereignLoans.length - 1; i >= 0; i--) {
            const loan = state.sovereignLoans[i];
            const lender = state.countries[loan.lenderId];
            const borrower = state.countries[loan.borrowerId];

            if (lender && borrower) {
              const installment = Math.min(loan.monthlyInstallment, borrower.treasury);
              borrower.treasury -= installment;
              lender.treasury += installment;
              loan.remainingPrincipal -= (loan.principal / loan.totalDurationMonths);
            }

            loan.remainingMonths -= 1;
            if (loan.remainingMonths <= 0) {
              state.sovereignLoans.splice(i, 1);
            }
          }
        }

        // 2. Bots Strategic AI Decisions
        if (window.WorldForge.Systems.Bot) {
          window.WorldForge.Systems.Bot.processAllBots(state, turnNumber);
        }

        // 3. Central Bank & Monetary Policy
        if (window.WorldForge.Systems.CentralBank) {
          window.WorldForge.Systems.CentralBank.processMonthly(state, turnNumber);
        }

        // 4. Commercial Banks & Credit Market
        if (window.WorldForge.Systems.Banking) {
          window.WorldForge.Systems.Banking.processMonthly(state, turnNumber);
        }
        if (window.WorldForge.Systems.Credit) {
          window.WorldForge.Systems.Credit.processMonthly(state, turnNumber);
        }

        // 5. Business and Households Micro-Aggregates
        if (window.WorldForge.Systems.Business) {
          window.WorldForge.Systems.Business.processMonthly(state, turnNumber);
        }
        if (window.WorldForge.Systems.Household) {
          window.WorldForge.Systems.Household.processMonthly(state, turnNumber);
        }

        // 6. Production & Resources (including Factories)
        if (window.WorldForge.Systems.Production) {
          window.WorldForge.Systems.Production.processMonthly(state, turnNumber);
        }
        if (window.WorldForge.Systems.Resource) {
          window.WorldForge.Systems.Resource.processMonthly(state, turnNumber);
        }

        // 7. Energy Grid & Power
        if (window.WorldForge.Systems.Energy) {
          window.WorldForge.Systems.Energy.processMonthly(state, turnNumber);
        }

        // 8. International Trade & Bilateral Deals
        if (window.WorldForge.Systems.Trade) {
          window.WorldForge.Systems.Trade.processMonthly(state, turnNumber);
        }

        // 8b. Global Exchange Markets (notowania surowców/kruszców i akcji,
        // regresja do wartości fundamentalnej, dywidendy akcyjne)
        if (window.WorldForge.Systems.Exchange) {
          window.WorldForge.Systems.Exchange.processMonthly(state, turnNumber);
        }

        // 9. Taxes and Fiscal Collections
        if (window.WorldForge.Systems.Tax) {
          window.WorldForge.Systems.Tax.processMonthly(state, turnNumber);
        }

        // 10. Sovereign Debt & Bond Maturities/Coupons
        if (window.WorldForge.Systems.Debt) {
          window.WorldForge.Systems.Debt.processMonthly(state, turnNumber);
        }

        // 11. National Budget Execution & Treasury Balances
        if (window.WorldForge.Systems.Budget) {
          window.WorldForge.Systems.Budget.processMonthly(state, turnNumber);
        }

        // 12. Macroeconomic Growth (GDP, Inflation, Unemployment, Exchange Rates)
        if (window.WorldForge.Systems.Economy) {
          window.WorldForge.Systems.Economy.processMonthly(state, turnNumber);
        }

        // 13. Demographics & Workforce
        if (window.WorldForge.Systems.Population) {
          window.WorldForge.Systems.Population.processMonthly(state, turnNumber);
        }

        // 14. Infrastructure & Megaprojects
        if (window.WorldForge.Systems.Infrastructure) {
          window.WorldForge.Systems.Infrastructure.processMonthly(state, turnNumber);
        }
        if (window.WorldForge.Systems.Project) {
          window.WorldForge.Systems.Project.processMonthly(state, turnNumber);
        }

        // 15. Research & Scientific Progress
        if (window.WorldForge.Systems.Research) {
          window.WorldForge.Systems.Research.processMonthly(state, turnNumber);
        }

        // 16. Military Readiness & Deterrence
        if (window.WorldForge.Systems.Military) {
          window.WorldForge.Systems.Military.processMonthly(state, turnNumber);
        }

        // 17. Diplomacy
        if (window.WorldForge.Systems.Diplomacy) {
          window.WorldForge.Systems.Diplomacy.processMonthly(state, turnNumber);
        }

        // 18. Dynamic Events & Crises
        if (window.WorldForge.Systems.Event) {
          window.WorldForge.Systems.Event.processMonthly(state, turnNumber);
        }

        // Advance turn counter
        state.time.currentTurn += 1;
        state.time.turnProgressSeconds = 0;

        const playerCountryAfter = window.WorldForge.Core.GameState.getPlayerCountry();

        // 19. Generate Turn End Report
        const report = this.generateTurnReport(state, turnNumber, playerCountryBefore, playerCountryAfter);
        state.turnReports.push(report);
        // Limit magazynu raportów: trzymana jest historia ostatnich 24 miesięcy
        // (starsze raporty i tak nie są nigdzie wyświetlane, a rosnący bufor
        // rozsadzał limit localStorage przy zapisie gry)
        if (state.turnReports.length > 24) {
          state.turnReports = state.turnReports.slice(-24);
        }

        // 20. Auto-Save
        window.WorldForge.Core.SaveSystem.saveGame('autosave');

        // 21. Sync State in Multiplayer if Host
        if (window.WorldForge.Network && window.WorldForge.Network.isMultiplayer && window.WorldForge.Network.isHost) {
          window.WorldForge.Network.syncState(state, state.time.currentTurn, report);
        }

        this.emit('turnCompleted', {
          completedTurn: turnNumber,
          newTurn: state.time.currentTurn,
          report: report
        });

      } catch (err) {
        console.error(`[TurnEngine] Błąd w potoku rozliczeniowym tury:`, err);
      } finally {
        this.isProcessingTurn = false;
      }
    }

    generateTurnReport(state, turnNumber, before, after) {
      const F = window.WorldForge.Format;
      const dateInfo = F.formatTurnDate(state.time.startDate, turnNumber);
      const diffGdp = after.economy.gdpNominal - before.economy.gdpNominal;
      const diffInflation = after.economy.inflation - before.economy.inflation;
      const diffUnemp = after.economy.unemployment - before.economy.unemployment;
      const diffTreasury = after.treasury - before.treasury;
      const diffDebt = after.debt.totalDebt - before.debt.totalDebt;
      const diffApproval = after.economy.socialApproval - before.economy.socialApproval;

      const explanations = [];
      if (after.budget.balanceMonthly < 0) {
        explanations.push(`Deficyt budżetowy w wysokości ${F.money(Math.abs(after.budget.balanceMonthly), 'USD', { rawText: true })} obciążył rezerwy skarbu.`);
      } else {
        explanations.push(`Nadwyżka budżetowa wyniosła ${F.money(after.budget.balanceMonthly, 'USD', { rawText: true })} i zasiliła rezerwy skarbu.`);
      }

      if (diffInflation > 0.2) {
        explanations.push(`Wzrost inflacji o ${diffInflation.toFixed(1)} pp. wskutek presji kosztowej surowców i popytu.`);
      } else if (diffInflation < -0.2) {
        explanations.push(`Spadek inflacji o ${Math.abs(diffInflation).toFixed(1)} pp. dzięki polityce stóp banku centralnego.`);
      }

      if (diffGdp > 0) {
        explanations.push(`Wzrost PKB napędzany inwestycjami przedsiębiorstw, infrastrukturą i produkcją.`);
      } else if (diffGdp < 0) {
        explanations.push(`Spowolnienie gospodarcze wynikające z obciążeń podatkowych lub napięć handlowych.`);
      }

      return {
        turn: turnNumber,
        date: dateInfo.formatted,
        monthName: dateInfo.monthName,
        year: dateInfo.year,
        gdpBefore: before.economy.gdpNominal,
        gdpAfter: after.economy.gdpNominal,
        gdpDiff: diffGdp,
        gdpGrowthRate: after.economy.gdpGrowthYoY,
        revenues: after.budget.revenues.total,
        spending: after.budget.spending.totalExpenditure,
        balance: after.budget.balanceMonthly,
        primaryBalance: after.budget.primaryBalance,
        debtServicing: after.budget.spending.debtServicing,
        treasury: after.treasury,
        treasuryDiff: diffTreasury,
        debtTotal: after.debt.totalDebt,
        debtDiff: diffDebt,
        debtToGdp: after.debt.debtToGdp,
        inflation: after.economy.inflation,
        inflationDiff: diffInflation,
        unemployment: after.economy.unemployment,
        unemploymentDiff: diffUnemp,
        socialApproval: after.economy.socialApproval,
        approvalDiff: diffApproval,
        activeProjectsCount: after.projects.active.length,
        researchStatus: after.research.activeTechId ? 'W toku' : 'Brak wyznaczonego celu',
        explanations: explanations
      };
    }

    on(event, callback) {
      this.subscribers.push({ event, callback });
    }

    emit(event, data) {
      for (const sub of this.subscribers) {
        if (sub.event === event) {
          try {
            sub.callback(data);
          } catch (e) {
            console.error('[TurnEngine] Błąd event listenera:', e);
          }
        }
      }
    }
  }

  window.WorldForge.Core.TurnEngine = new TurnEngine();
})();
