/**
 * WorldForge: Nations - Central Bank, Commercial Banking & Debt UI
 * Functional FX currency interventions ("Umocnij walutę"), bond emissions and bank bailouts.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const BankingUI = {
    render(container) {
      if (!container) return;

      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      const F = window.WorldForge.Format;
      const cb = country.centralBank;
      const banks = country.commercialBanks || [];
      const cm = country.creditMarket;
      const debt = country.debt;

      const isMonetaryUnion = !!country.monetaryUnion && !country.isUnionLeader;

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Central Bank & Monetary Policy Levers -->
          <div class="wf-card" style="border-left: 3px solid var(--accent);">
            <div class="card-header">
              <span class="card-title">${cb.name}</span>
              ${isMonetaryUnion ? '<span class="wf-badge wf-badge-amber">Unia Walutowa (EBC)</span>' : '<span class="wf-badge wf-badge-green">Autonomiczny Bank Centralny</span>'}
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Interest Rate Slider -->
              <div class="slider-group">
                <div class="slider-header">
                  <span>Główna Stopa Referencyjna:</span>
                  <span class="font-mono text-accent" id="val-cb-baseRate">${cb.baseRate.toFixed(2)}%</span>
                </div>
                <input type="range" class="wf-slider" id="input-cb-rate" min="0.0" max="25.0" step="0.25" value="${cb.baseRate}" ${isMonetaryUnion ? 'disabled title="Państwa unii walutowej nie mogą samodzielnie zmieniać stóp procentowych"' : ''} />
                <span style="font-size: 10px; color: var(--text-muted);">Cel inflacyjny: ${cb.inflationTarget.toFixed(1)}% • Podaż M2: ${F.money(cb.m2MoneySupply, 'USD')}</span>
              </div>

              <!-- Reserve Requirement Slider -->
              <div class="slider-group">
                <div class="slider-header">
                  <span>Stopa Rezerwy Obowiązkowej:</span>
                  <span class="font-mono text-accent" id="val-cb-reserveReq">${cb.reserveRequirement.toFixed(1)}%</span>
                </div>
                <input type="range" class="wf-slider" id="input-cb-reserve" min="1.0" max="15.0" step="0.5" value="${cb.reserveRequirement}" ${isMonetaryUnion ? 'disabled' : ''} />
              </div>

              <!-- FX Reserves & Interventions -->
              <div style="display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--border); padding-top: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px;">
                  <span>Rezerwy Walutowe [Stan FX]:</span>
                  <strong class="font-mono text-positive">${F.money(cb.foreignReserves, 'USD')}</strong>
                </div>
                <div style="display: flex; gap: 4px;">
                  <button class="wf-btn wf-btn-sm wf-btn-primary" id="btn-fx-buy-domestic" ${isMonetaryUnion ? 'disabled title="Niedostępne w unii walutowej"' : ''} style="flex: 1;">
                    Umocnij Walutę ($500M)
                  </button>
                  <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-fx-sell-domestic" ${isMonetaryUnion ? 'disabled title="Niedostępne w unii walutowej"' : ''} style="flex: 1;">
                    Akumuluj FX ($500M)
                  </button>
                </div>
                ${isMonetaryUnion ? '<div style="font-size: 10px; color: var(--warning);">Kraje w unii walutowej (np. strefa euro) dzielą wspólną politykę kursową.</div>' : ''}
              </div>
            </div>
          </div>

          <!-- Sovereign Debt & Bonds Manager -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Dług Publiczny i Obligacje</span>
              <button class="wf-btn wf-btn-sm wf-btn-primary" id="btn-open-issue-bonds-modal">+ Emisja Obligacji</button>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span>Dług Całkowity: <strong class="font-mono ${debt.debtToGdp > 80 ? 'text-negative' : 'text-primary'}">${F.money(debt.totalDebt, 'USD')} (${debt.debtToGdp.toFixed(1)}% PKB)</strong></span>
              <span>Rating: <strong class="text-accent font-mono">${debt.creditRating}</strong></span>
            </div>

            <div class="wf-table-container" style="max-height: 180px;">
              <table class="wf-table">
                <thead>
                  <tr>
                    <th>Seria</th>
                    <th>Wartość</th>
                    <th>Rentowność</th>
                    <th>Zapadłość</th>
                    <th>Opcja</th>
                  </tr>
                </thead>
                <tbody>
                  ${(debt.bonds || []).map(b => `
                    <tr>
                      <td style="font-size: 11px;">${b.name}</td>
                      <td class="font-mono text-positive">${F.money(b.principal, b.currency)}</td>
                      <td class="font-mono text-accent">${b.yieldRate.toFixed(2)}%</td>
                      <td class="font-mono">${b.maturityMonths} m-cy</td>
                      <td>
                        <button class="wf-btn wf-btn-sm wf-btn-secondary btn-buyback-bond" data-bond-id="${b.id}">
                          Wykup
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Commercial Banking Sector Health Table -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Banki Komercyjne</span>
            </div>

            <div class="wf-table-container" style="max-height: 180px;">
              <table class="wf-table">
                <thead>
                  <tr>
                    <th>Bank</th>
                    <th>Kapitał</th>
                    <th>CAR</th>
                    <th>NPL</th>
                    <th>Status</th>
                    <th>Akcja</th>
                  </tr>
                </thead>
                <tbody>
                  ${banks.map(b => {
                    const statusBadge = b.status === 'Zdrowy' ? '<span class="wf-badge wf-badge-green">Zdrowy</span>' :
                                        b.status === 'Ostrzeżenie' ? '<span class="wf-badge wf-badge-amber">Ostrzeżenie</span>' :
                                        '<span class="wf-badge wf-badge-red">Zagrożony</span>';
                    return `
                      <tr>
                        <td style="font-size: 11px;"><strong>${b.name}</strong></td>
                        <td class="font-mono text-accent">${F.money(b.capital, 'USD')}</td>
                        <td class="font-mono ${b.carSolvencyRatio < 10.5 ? 'text-negative' : 'text-positive'}">${b.carSolvencyRatio.toFixed(1)}%</td>
                        <td class="font-mono ${b.nplRatio > 6 ? 'text-negative' : 'text-primary'}">${b.nplRatio.toFixed(1)}%</td>
                        <td>${statusBadge}</td>
                        <td>
                          <button class="wf-btn wf-btn-sm wf-btn-secondary btn-bailout-bank" data-bank-id="${b.id}">
                            Bailout
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container);
    },

    bindEvents(container) {
      const countryId = window.WorldForge.Core.GameState.state.playerCountryId;

      // Base rate slider
      const rateSlider = container.querySelector('#input-cb-rate');
      if (rateSlider) {
        rateSlider.oninput = (e) => {
          const rate = parseFloat(e.target.value);
          const valEl = document.getElementById('val-cb-baseRate');
          if (valEl) valEl.textContent = `${rate.toFixed(2)}%`;
        };

        rateSlider.onchange = (e) => {
          const rate = parseFloat(e.target.value);
          window.WorldForge.Core.Commands.dispatch({
            type: 'SET_CENTRAL_BANK_RATE',
            countryId,
            payload: { rate }
          });
        };
      }

      // Reserve requirement slider
      const resSlider = container.querySelector('#input-cb-reserve');
      if (resSlider) {
        resSlider.oninput = (e) => {
          const ratio = parseFloat(e.target.value);
          const valEl = document.getElementById('val-cb-reserveReq');
          if (valEl) valEl.textContent = `${ratio.toFixed(1)}%`;
        };

        resSlider.onchange = (e) => {
          const ratio = parseFloat(e.target.value);
          window.WorldForge.Core.Commands.dispatch({
            type: 'SET_RESERVE_REQUIREMENT',
            countryId,
            payload: { ratio }
          });
        };
      }

      // FX intervention: Strengthen Currency ("Umocnij walutę")
      const fxBuyBtn = container.querySelector('#btn-fx-buy-domestic');
      if (fxBuyBtn) {
        fxBuyBtn.onclick = () => {
          const res = window.WorldForge.Core.Commands.dispatch({
            type: 'CB_FX_INTERVENTION',
            countryId,
            payload: { action: 'BUY_DOMESTIC', amount: 500000000 }
          });
          if (!res.success) {
            window.WorldForge.UI.Modal.showError('Interwencja Walutowa Nieudana', res.reason);
          }
          this.render(container);
          window.WorldForge.UI.Navigation.updateTopBar();
        };
      }

      // FX intervention: Weaken Currency / Accumulate FX
      const fxSellBtn = container.querySelector('#btn-fx-sell-domestic');
      if (fxSellBtn) {
        fxSellBtn.onclick = () => {
          const res = window.WorldForge.Core.Commands.dispatch({
            type: 'CB_FX_INTERVENTION',
            countryId,
            payload: { action: 'SELL_DOMESTIC', amount: 500000000 }
          });
          if (!res.success) {
            window.WorldForge.UI.Modal.showError('Operacja Nieudana', res.reason);
          }
          this.render(container);
          window.WorldForge.UI.Navigation.updateTopBar();
        };
      }

      // Bailout buttons
      container.querySelectorAll('.btn-bailout-bank').forEach(btn => {
        btn.onclick = () => {
          const bankId = btn.getAttribute('data-bank-id');
          window.WorldForge.Core.Commands.dispatch({
            type: 'BAILOUT_BANK',
            countryId,
            payload: { bankId, amount: 500000000 }
          });
          this.render(container);
        };
      });

      // Buyback bond buttons
      container.querySelectorAll('.btn-buyback-bond').forEach(btn => {
        btn.onclick = () => {
          const bondId = btn.getAttribute('data-bond-id');
          window.WorldForge.Core.Commands.dispatch({
            type: 'BUYBACK_BONDS',
            countryId,
            payload: { bondId, amount: 500000000 }
          });
          this.render(container);
        };
      });

      // Issue bonds modal trigger
      const issueBondsBtn = container.querySelector('#btn-open-issue-bonds-modal');
      if (issueBondsBtn) {
        issueBondsBtn.onclick = () => this.showIssueBondsModal();
      }
    },

    showIssueBondsModal() {
      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      const modalHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <p style="font-size: 11px; color: var(--text-secondary);">
            Emisja obligacji skarbowych pozwala pozyskać natychmiastowe fundusze do Skarbu Państwa kosztem comiesięcznych odsetek.
          </p>

          <div class="slider-group">
            <label style="font-size: 11px; font-weight: 500;">Wartość Emisji (USD):</label>
            <input type="number" id="modal-bond-amount" class="wf-input" value="2000000000" min="100000000" max="50000000000" step="100000000" />
          </div>

          <div class="slider-group">
            <label style="font-size: 11px; font-weight: 500;">Okres Zapadalności:</label>
            <select id="modal-bond-maturity" class="wf-select">
              <option value="12">1 Rok (12 m-cy)</option>
              <option value="60" selected>5 Lat (60 m-cy)</option>
              <option value="120">10 Lat (120 m-cy)</option>
              <option value="360">30 Lat (360 m-cy)</option>
            </select>
          </div>

          <div class="slider-group">
            <label style="font-size: 11px; font-weight: 500;">Waluta Emisji:</label>
            <select id="modal-bond-currency" class="wf-select">
              <option value="${country.currency}" selected>Waluta krajowa (${country.currency})</option>
              <option value="USD">Dolar amerykański (USD)</option>
            </select>
          </div>
        </div>
      `;

      window.WorldForge.UI.Modal.show({
        title: 'Nowa Emisja Obligacji Skarbowych',
        contentHtml: modalHtml,
        buttons: [
          { text: 'Anuluj', class: 'wf-btn-secondary', autoClose: true },
          {
            text: 'Wyemituj',
            class: 'wf-btn-primary',
            autoClose: true,
            onClick: () => {
              const amount = parseFloat(document.getElementById('modal-bond-amount')?.value || 2000000000);
              const maturity = parseInt(document.getElementById('modal-bond-maturity')?.value || 60, 10);
              const curr = document.getElementById('modal-bond-currency')?.value || country.currency;

              window.WorldForge.Core.Commands.dispatch({
                type: 'ISSUE_BONDS',
                countryId: country.id,
                payload: {
                  amount,
                  maturityMonths: maturity,
                  currency: curr,
                  bondType: 'Standard'
                }
              });

              window.WorldForge.UI.Navigation.updateTopBar();
              const drawerContent = document.getElementById('right-drawer-content');
              if (drawerContent) BankingUI.render(drawerContent);
            }
          }
        ]
      });
    }
  };

  window.WorldForge.UI.Banking = BankingUI;
})();
