/**
 * WorldForge: Nations - International Trade & Interactive Order Desk UI
 * Allows selling/buying any custom amount at custom or spot prices, bilateral agreements, and dependencies.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const TradeUI = {
    render(container) {
      if (!container) return;

      const state = window.WorldForge.Core.GameState.getState();
      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!state || !country) return;

      const F = window.WorldForge.Format;
      const resList = window.WorldForge.Data.Resources || [];
      const prod = country.production || {};
      const deals = state.bilateralDeals || [];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Top Trade Summary Header -->
          <div class="wf-card" style="border-left: 3px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <div>
                <strong style="font-size: 13px;">Giełda Towarowa i Handel Międzynarodowy</strong>
                <div style="font-size: 10px; color: var(--text-muted);">Błyskawiczny handel surowcami spot i długoterminowe kontrakty bilateralne</div>
              </div>
              <span class="wf-badge wf-badge-cyan">Rezerwy Skarbu: ${F.money(country.treasury, 'USD')}</span>
            </div>
          </div>

          <!-- Spot Market Table with Clickable Trading Rows -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Rynek Spot – Kliknij surowiec, aby sprzedać lub kupić</span>
            </div>

            <div class="wf-table-container" style="max-height: 260px;">
              <table class="wf-table">
                <thead>
                  <tr>
                    <th>Towar</th>
                    <th>Cena Spot</th>
                    <th>Zapas Magazynu</th>
                    <th>Zależność</th>
                    <th>Zlecenie</th>
                  </tr>
                </thead>
                <tbody>
                  ${resList.map(res => {
                    const item = prod[res.id] || { output: 0, consumption: 0, stockpile: 0, dependencyOnTopSupplierPercent: 10 };
                    const spotPrice = state.globalMarket?.prices[res.id] || res.basePrice;
                    const depClass = item.dependencyOnTopSupplierPercent > 60 ? 'wf-badge-red' : (item.dependencyOnTopSupplierPercent > 30 ? 'wf-badge-amber' : 'wf-badge-green');

                    return `
                      <tr class="row-trade-resource" data-res-id="${res.id}" style="cursor: pointer;">
                        <td>
                          <strong>${res.icon} ${res.name}</strong>
                          <div style="font-size: 9px; color: var(--text-muted);">${res.unit}</div>
                        </td>
                        <td class="font-mono text-positive" style="font-weight: 600;">$${spotPrice.toFixed(1)}</td>
                        <td class="font-mono ${item.stockpile <= 0 ? 'text-negative' : 'text-primary'}">${F.number(item.stockpile, { rawText: true })}</td>
                        <td><span class="wf-badge ${depClass}">${item.dependencyOnTopSupplierPercent.toFixed(0)}%</span></td>
                        <td>
                          <div style="display: flex; gap: 3px;">
                            <button class="wf-btn wf-btn-sm wf-btn-primary btn-open-buy-trade" data-res-id="${res.id}">
                              Kup
                            </button>
                            <button class="wf-btn wf-btn-sm wf-btn-secondary btn-open-sell-trade" data-res-id="${res.id}" ${item.stockpile <= 0 ? 'disabled' : ''}>
                              Sprzedaj
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Bilateral Contract Proposal Form -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Zawrzyj Długoterminowy Kontrakt Bilateralny</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div class="slider-group">
                <label style="font-size: 11px;">Partner Handlowy (Kraj / Gracz):</label>
                <select id="trade-propose-partner" class="wf-select">
                  ${Object.values(state.countries).filter(c => c.id !== state.playerCountryId).map(c => `
                    <option value="${c.id}">${c.flag} ${c.namePl} (${c.id})</option>
                  `).join('')}
                </select>
              </div>

              <div class="slider-group">
                <label style="font-size: 11px;">Eksportowany Towar:</label>
                <select id="trade-propose-resource" class="wf-select">
                  ${resList.map(r => `
                    <option value="${r.id}">${r.icon} ${r.name}</option>
                  `).join('')}
                </select>
              </div>

              <div class="grid-2">
                <div class="slider-group">
                  <label style="font-size: 11px;">Ilość / miesiąc:</label>
                  <input type="number" id="trade-propose-amount" class="wf-input font-mono" value="1000" min="10" max="500000" />
                </div>
                <div class="slider-group">
                  <label style="font-size: 11px;">Cena kontraktowa ($/jedn.):</label>
                  <input type="number" id="trade-propose-price" class="wf-input font-mono" value="120" min="1" max="100000" />
                </div>
              </div>

              <div class="slider-group">
                <label style="font-size: 11px;">Okres trwania kontraktu:</label>
                <select id="trade-propose-duration" class="wf-select">
                  <option value="6">6 miesięcy</option>
                  <option value="12" selected>12 miesięcy (1 rok)</option>
                  <option value="24">24 miesiące (2 lata)</option>
                  <option value="36">36 miesięcy (3 lata)</option>
                </select>
              </div>

              <button class="wf-btn wf-btn-primary wf-btn-sm" id="btn-submit-propose-deal" style="margin-top: 4px;">
                🤝 Zaproponuj Kontrakt Handlowy
              </button>
            </div>
          </div>

          <!-- Active Bilateral Deals List -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Aktywne Umowy Bilateralne (${deals.length})</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;">
              ${deals.length > 0 ? deals.map(d => {
                const partnerId = d.exporterId === state.playerCountryId ? d.importerId : d.exporterId;
                const partner = state.countries[partnerId];
                const resMeta = resList.find(r => r.id === d.resourceId);
                const isExport = d.exporterId === state.playerCountryId;

                return `
                  <div style="background: var(--bg-panel); padding: 8px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight: 600; font-size: 11px;">
                        ${partner?.flag} ${partner?.namePl}: ${isExport ? 'Eksport' : 'Import'} ${resMeta?.name}
                      </div>
                      <div style="font-size: 10px; color: var(--text-muted);">
                        ${F.number(d.monthlyAmount, { rawText: true })} jedn./m-c @ $${d.agreedPrice} • Pozostało: ${d.remainingMonths} m-cy
                      </div>
                    </div>
                    <button class="wf-btn wf-btn-sm wf-btn-danger btn-cancel-deal" data-deal-id="${d.id}">
                      Zerwij
                    </button>
                  </div>
                `;
              }).join('') : '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 10px;">Brak aktywnych umów bilateralnych.</div>'}
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container);
    },

    bindEvents(container) {
      const countryId = window.WorldForge.Core.GameState.state.playerCountryId;
      const country = window.WorldForge.Core.GameState.getPlayerCountry();

      // Open Buy Dialog
      container.querySelectorAll('.btn-open-buy-trade').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const resId = btn.getAttribute('data-res-id');
          this.showTradeOrderModal(country, resId, 'BUY', container);
        };
      });

      // Open Sell Dialog
      container.querySelectorAll('.btn-open-sell-trade').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const resId = btn.getAttribute('data-res-id');
          this.showTradeOrderModal(country, resId, 'SELL', container);
        };
      });

      // Row click opens trade modal
      container.querySelectorAll('.row-trade-resource').forEach(row => {
        row.onclick = (e) => {
          if (e.target.tagName === 'BUTTON') return;
          const resId = row.getAttribute('data-res-id');
          this.showTradeOrderModal(country, resId, 'SELL', container);
        };
      });

      // Propose contract
      const proposeBtn = container.querySelector('#btn-submit-propose-deal');
      if (proposeBtn) {
        proposeBtn.onclick = () => {
          const partnerId = container.querySelector('#trade-propose-partner')?.value;
          const resourceId = container.querySelector('#trade-propose-resource')?.value;
          const monthlyAmount = parseFloat(container.querySelector('#trade-propose-amount')?.value || 1000);
          const agreedPrice = parseFloat(container.querySelector('#trade-propose-price')?.value || 120);
          const durationMonths = parseInt(container.querySelector('#trade-propose-duration')?.value || 12, 10);

          const result = window.WorldForge.Core.Commands.dispatch({
            type: 'CREATE_BILATERAL_DEAL',
            countryId,
            payload: {
              importerId: partnerId,
              resourceId,
              monthlyAmount,
              agreedPrice,
              durationMonths
            }
          });

          if (!result.success) {
            alert('Oferta odrzucona: ' + result.reason);
          }
          this.render(container);
          window.WorldForge.UI.Navigation.updateTopBar();
        };
      }

      // Cancel deal
      container.querySelectorAll('.btn-cancel-deal').forEach(btn => {
        btn.onclick = () => {
          const dealId = btn.getAttribute('data-deal-id');
          window.WorldForge.Core.Commands.dispatch({
            type: 'CANCEL_BILATERAL_DEAL',
            countryId,
            payload: { dealId }
          });
          this.render(container);
          window.WorldForge.UI.Navigation.updateTopBar();
        };
      });
    },

    showTradeOrderModal(country, resId, action, container) {
      const state = window.WorldForge.Core.GameState.getState();
      const resMeta = window.WorldForge.Data.Resources.find(r => r.id === resId);
      if (!resMeta) return;

      const F = window.WorldForge.Format;
      const item = country.production?.[resId] || { stockpile: 0, output: 0, consumption: 0 };
      const spotPrice = state.globalMarket?.prices[resId] || resMeta.basePrice;
      const maxAvailableToSell = item.stockpile;

      const isBuy = (action === 'BUY');
      const defaultAmount = isBuy ? 5000 : Math.min(maxAvailableToSell, 5000);

      const modalHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-panel-secondary); padding: 8px 12px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
            <div>
              <strong style="font-size: 14px;">${resMeta.icon} ${resMeta.name}</strong>
              <div style="font-size: 11px; color: var(--text-muted);">${resMeta.category} • Jednostka: ${resMeta.unit}</div>
            </div>
            <div style="text-align: right;">
              <span class="stat-label">Cena Rynkowa Spot:</span>
              <div class="font-mono text-positive" style="font-weight: 700; font-size: 14px;">$${spotPrice.toFixed(1)} / ${resMeta.unit}</div>
            </div>
          </div>

          <!-- Stockpile & Cash status -->
          <div class="grid-2">
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 5px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Zapas w Twoim Magazynie:</span>
              <span class="stat-value font-mono text-accent">${F.number(item.stockpile, { rawText: true })} ${resMeta.unit}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 5px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Stan Skarbu Państwa:</span>
              <span class="stat-value font-mono text-positive">${F.money(country.treasury, 'USD')}</span>
            </div>
          </div>

          <!-- Form: Quantity & Price inputs -->
          <div class="slider-group">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label style="font-size: 11px; font-weight: 600;">Ilość do ${isBuy ? 'zakupu' : 'sprzedaży'} (${resMeta.unit}):</label>
              ${!isBuy && maxAvailableToSell > 0 ? `
                <div style="display: flex; gap: 3px;">
                  <button type="button" class="wf-btn wf-btn-sm wf-btn-secondary btn-set-qty-preset" data-pct="0.25">25%</button>
                  <button type="button" class="wf-btn wf-btn-sm wf-btn-secondary btn-set-qty-preset" data-pct="0.50">50%</button>
                  <button type="button" class="wf-btn wf-btn-sm wf-btn-secondary btn-set-qty-preset" data-pct="1.00">Wszystko (100%)</button>
                </div>
              ` : ''}
            </div>
            <input type="number" id="trade-order-amount" class="wf-input font-mono" value="${defaultAmount}" min="1" ${!isBuy ? `max="${maxAvailableToSell}"` : ''} />
          </div>

          <div class="slider-group">
            <label style="font-size: 11px; font-weight: 600;">Cena jednostkowa transakcji ($/jedn.):</label>
            <input type="number" id="trade-order-price" class="wf-input font-mono" value="${spotPrice.toFixed(1)}" min="0.1" step="0.5" />
          </div>

          <!-- Live Projected Total Value -->
          <div style="background: var(--bg-panel); border: 1px solid var(--border); padding: 8px 12px; border-radius: var(--border-radius-xs); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: var(--text-secondary);">Łączna Wartość Transakcji:</span>
            <strong class="font-mono text-positive" id="trade-order-total-val" style="font-size: 15px;">
              ${F.money(defaultAmount * spotPrice * 1000, 'USD')}
            </strong>
          </div>
        </div>
      `;

      window.WorldForge.UI.Modal.show({
        title: isBuy ? `🛒 Zlecenie Kupna: ${resMeta.name}` : `📦 Zlecenie Sprzedaży: ${resMeta.name}`,
        contentHtml: modalHtml,
        buttons: [
          { text: 'Anuluj', class: 'wf-btn-secondary', autoClose: true },
          {
            text: isBuy ? 'Zrealizuj Zakup (Pobierz ze Skarbu)' : 'Zrealizuj Sprzedaż (Zasil Skarb)',
            class: isBuy ? 'wf-btn-primary' : 'wf-btn-success',
            autoClose: true,
            onClick: () => {
              const amount = parseFloat(document.getElementById('trade-order-amount')?.value || defaultAmount);
              const customPrice = parseFloat(document.getElementById('trade-order-price')?.value || spotPrice);

              const res = window.WorldForge.Core.Commands.dispatch({
                type: 'EXECUTE_TRADE',
                countryId: country.id,
                payload: {
                  resourceId: resId,
                  action: isBuy ? 'BUY' : 'SELL',
                  amount: amount,
                  customPrice: customPrice
                }
              });

              if (!res.success) {
                alert('Błąd realizacji zlecenia: ' + res.reason);
              }

              window.WorldForge.UI.Navigation.updateTopBar();
              this.render(container);
            }
          }
        ]
      });

      // Recalculate total value live
      const amountInput = document.getElementById('trade-order-amount');
      const priceInput = document.getElementById('trade-order-price');
      const totalValEl = document.getElementById('trade-order-total-val');

      const updateOrderTotal = () => {
        const amt = parseFloat(amountInput?.value || 0);
        const prc = parseFloat(priceInput?.value || 0);
        const total = Math.round(amt * prc * 1000);
        if (totalValEl) totalValEl.innerHTML = F.money(total, 'USD');
      };

      amountInput?.addEventListener('input', updateOrderTotal);
      priceInput?.addEventListener('input', updateOrderTotal);

      // Preset buttons for 25%, 50%, 100%
      document.querySelectorAll('.btn-set-qty-preset').forEach(presetBtn => {
        presetBtn.onclick = () => {
          const pct = parseFloat(presetBtn.getAttribute('data-pct'));
          const targetQty = Math.floor(maxAvailableToSell * pct);
          if (amountInput) {
            amountInput.value = targetQty;
            updateOrderTotal();
          }
        };
      });
    }
  };

  window.WorldForge.UI.Trade = TradeUI;
})();
