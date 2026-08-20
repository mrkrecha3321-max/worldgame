/**
 * WorldForge: Nations - Politics, Elections, UN Summits & Sovereign Bankruptcy System
 * Handles democratic elections, international summits, liquidity crises and bankruptcy.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const PoliticsSystem = {
    checkBankruptcyAndGameOver(state, countryId, turnNumber) {
      const country = state.countries[countryId];
      if (!country) return null;

      const debtRatio = country.debt.debtToGdp;
      const treasury = country.treasury;
      const approval = country.economy.socialApproval;

      // 1. Sovereign Debt Default Condition
      if (debtRatio > 180.0 && treasury <= 0 && country.debt.creditRating === 'D') {
        return {
          isGameOver: true,
          reason: 'BANKRUPTCY',
          title: '🏦 OGŁOSZENIE NIEWYPŁACALNOŚCI PAŃSTWA (DEFAULT)',
          message: `Dług publiczny osiągnął katastrofalny poziom ${debtRatio.toFixed(1)}% PKB, a rezerwy Skarbu Państwa zostały całkowicie wyczerpane. Rynki finansowe odmówiły dalszego zakupu obligacji skarbowych.`
        };
      }

      // 2. Political Collapse / Revolution Condition
      if (approval < 5.0 && country.economy.politicalStability < 15.0) {
        return {
          isGameOver: true,
          reason: 'REVOLUTION',
          title: '🔥 KATASTROFA POLITYCZNA I UPADEK RZĄDU',
          message: `Poparcie społeczne rządu spadło do skrajnego poziomu (${approval.toFixed(1)}%). W kraju wybuchł strajk generalny i doszło do rozwiązania parlamentu.`
        };
      }

      // 3. Liquidity Crisis Condition (Treasury <= 0)
      if (treasury <= 0) {
        return {
          isLiquidityCrisis: true,
          title: '🚨 KRYZYS PŁYNNOŚCI SKARBU PAŃSTWA – OSTATNIA SZANSA',
          message: `Skarb Państwa nie posiada płynnych środków na sfinansowanie bieżących wydatków publicznych! Musisz natychmiast podjąć decyzję ratunkową.`
        };
      }

      return null;
    },

    takeEmergency100BLoan(country) {
      const loanPrincipal = 100000000000; // 100 mld USD
      country.treasury += loanPrincipal;
      country.debt.totalDebt += loanPrincipal;
      country.debt.debtToGdp = (country.debt.totalDebt / Math.max(1, country.economy.gdpNominal)) * 100;

      // 10 months repayment plan with 10% annual rate
      const bond = {
        id: 'bond_emergency_' + Date.now(),
        name: 'Awaryjny Kredyt Ratunkowy (100 mld USD)',
        principal: loanPrincipal,
        yieldRate: 10.0,
        maturityMonths: 10,
        totalDurationMonths: 10,
        currency: 'USD',
        investorGroup: 'Konsorcjum Banków Ratunkowych & MFW',
        isForeign: true,
        issuedTurn: window.WorldForge.Core.GameState.state.time.currentTurn
      };

      if (!country.debt.bonds) country.debt.bonds = [];
      country.debt.bonds.push(bond);

      window.WorldForge.Core.GameState.addNotification(
        'warning',
        'Zaciągnięto Awaryjny Kredyt 100 mld USD',
        `Skarb Państwa zasilony kwotą 100 mld USD. Rata spłaty wynosi ~10.8 mld USD/m-c przez 10 miesięcy.`,
        country.id
      );

      return true;
    },

    applyAusterityPlan(country) {
      // Automatic austerity: balance budget
      window.WorldForge.Core.Commands.dispatch({
        type: 'AUTO_BALANCE_BUDGET',
        countryId: country.id,
        payload: {}
      });
      country.treasury += 10000000000; // 10 mld bridge capital

      window.WorldForge.Core.GameState.addNotification(
        'info',
        'Wdrożenie Planu Cięć Budżetowych',
        `Wydatki publiczne zredukowane, podwyższono efektywność poboru podatków.`,
        country.id
      );

      return true;
    },

    processMonthly(state, turnNumber) {
      const playerCountry = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!playerCountry) return;

      const crisis = this.checkBankruptcyAndGameOver(state, state.playerCountryId, turnNumber);
      if (crisis) {
        if (crisis.isGameOver) {
          window.WorldForge.UI.Modal.show({
            title: crisis.title,
            contentHtml: `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <p style="font-size: 13px; color: var(--text-primary); line-height: 1.5;">${crisis.message}</p>
                <div style="background: var(--bg-panel-secondary); padding: 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
                  <strong>Podsumowanie Kadencji:</strong>
                  <ul style="padding-left: 16px; font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                    <li>Czas trwania rządów: <strong>${turnNumber} miesięcy</strong></li>
                    <li>PKB końcowe: <strong>${window.WorldForge.Format.money(playerCountry.economy.gdpNominal, 'USD')}</strong></li>
                    <li>Dług publiczny: <strong>${playerCountry.debt.debtToGdp.toFixed(1)}% PKB</strong></li>
                    <li>Poparcie: <strong>${playerCountry.economy.socialApproval.toFixed(1)}%</strong></li>
                  </ul>
                </div>
              </div>
            `,
            buttons: [
              {
                text: 'Rozpocznij Nową Grę',
                class: 'wf-btn-primary',
                onClick: () => {
                  window.WorldForge.UI.StartScreen.show();
                }
              }
            ]
          });
        } else if (crisis.isLiquidityCrisis) {
          window.WorldForge.UI.Modal.show({
            title: crisis.title,
            contentHtml: `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <p style="font-size: 12px; color: var(--text-primary); line-height: 1.45;">${crisis.message}</p>
                <div style="font-size: 11px; font-weight: 600; color: var(--accent);">Wybierz plan ratunkowy:</div>
              </div>
            `,
            buttons: [
              {
                text: '1. Weź Kredyt Ratunkowy 100 mld USD (10% na 10 m-cy)',
                class: 'wf-btn-primary',
                onClick: () => {
                  PoliticsSystem.takeEmergency100BLoan(playerCountry);
                  window.WorldForge.UI.Navigation.updateTopBar();
                  window.WorldForge.UI.App.renderActiveTab(window.WorldForge.UI.Navigation.activeTabId);
                }
              },
              {
                text: '2. Zastosuj Natychmiastowe Cięcia Budżetowe (Austerity)',
                class: 'wf-btn-secondary',
                onClick: () => {
                  PoliticsSystem.applyAusterityPlan(playerCountry);
                  window.WorldForge.UI.Navigation.updateTopBar();
                  window.WorldForge.UI.App.renderActiveTab(window.WorldForge.UI.Navigation.activeTabId);
                }
              },
              {
                text: '3. Ogłoś Bankructwo Państwa (Koniec Gry)',
                class: 'wf-btn-danger',
                onClick: () => {
                  window.WorldForge.UI.StartScreen.show();
                }
              }
            ]
          });
        }
      }

      // Democratic Elections every 48 turns (4 years)
      if (turnNumber > 1 && turnNumber % 48 === 0) {
        const approval = playerCountry.economy.socialApproval;
        const wonElection = approval >= 45.0;

        if (wonElection) {
          playerCountry.economy.politicalStability = Math.min(99, playerCountry.economy.politicalStability + 8);
          window.WorldForge.Core.GameState.addNotification(
            'success',
            '🗳️ WYBORY PARLAMENTARNE: ZWYCIĘSTWO!',
            `Twój rząd uzyskał ${approval.toFixed(1)}% głosów obywateli i zdobył większość parlamentarną na kolejną 4-letnią kadencję!`,
            state.playerCountryId
          );
        } else {
          playerCountry.economy.politicalStability = Math.max(20, playerCountry.economy.politicalStability - 15);
          window.WorldForge.Core.GameState.addNotification(
            'warning',
            '🗳️ WYBORY PARLAMENTARNE: RZĄD MNIEJSZOŚCIOWY',
            `Niskie poparcie (${approval.toFixed(1)}%) wymusiło utworzenie trudnej koalicji parlamentarnej. Wzrosła presja na reformy gospodarcze.`,
            state.playerCountryId
          );
        }
      }
    }
  };

  window.WorldForge.Systems.Politics = PoliticsSystem;
})();
