/**
 * WorldForge: Nations - Global Exchange & Sovereign Portfolio Full-Screen Terminal UI
 * Features:
 * - Real Candlestick (świecowe) & Bar Charts with Open, High, Low, Close & Volume
 * - Gold Vaults with tonnage counter and inflation/rating boost
 * - Order Book market impact
 * - Global Corporate Equities & Dividends
 * - Sovereign Wealth Fund P&L tracking
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const ExchangeUI = {
    activeCategory: 'commodities', // 'commodities' | 'stocks' | 'gold_vault'
    selectedAssetId: 'gold',

    render(container) {
      if (!container) return;

      const state = window.WorldForge.Core.GameState.getState();
      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!state || !country) return;

      const F = window.WorldForge.Format;
      const exData = window.WorldForge.Core.GameState.getExchangeMarket();
      const portfolio = country.portfolio || { commodities: {}, stocks: {}, monthlyDividends: 0 };
      const goldOz = portfolio.commodities?.gold || 0;
      const goldTons = (goldOz / 32150.7).toFixed(1);
      const goldPriceNow = (exData.commodities.find(c => c.id === 'gold') || {}).currentPrice || 4500;
      const goldCoveragePct = country.economy?.gdpNominal ? (goldOz * goldPriceNow / country.economy.gdpNominal) * 100 : null;

      // Compute total portfolio valuation
      let totalPortfolioVal = 0;
      for (const [cid, qty] of Object.entries(portfolio.commodities || {})) {
        const item = exData.commodities.find(c => c.id === cid);
        if (item) totalPortfolioVal += (qty * item.currentPrice);
      }
      for (const [stk, shares] of Object.entries(portfolio.stocks || {})) {
        const stock = exData.stocks.find(s => s.ticker === stk);
        if (stock) totalPortfolioVal += (shares * stock.sharePrice);
      }

      const activeCommodity = exData.commodities.find(c => c.id === this.selectedAssetId) || exData.commodities[0];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          
          <!-- Sovereign Portfolio Header Banner -->
          <div class="wf-card" style="border-left: 3px solid var(--warning); padding: 10px 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong style="font-size: 13px;">Giełda Globalna & Państwowy Fundusz Majątkowy</strong>
                <div style="font-size: 10px; color: var(--text-muted);">Terminal obrotu kruszcami, surowcami strategicznymi i akcjami korporacji</div>
              </div>
              <div style="text-align: right;">
                <span class="stat-label">Wycena Portfela Rezerw:</span>
                <div class="font-mono text-positive" style="font-size: 16px; font-weight: 700;">${F.money(totalPortfolioVal, 'USD')}</div>
              </div>
            </div>

            <!-- Gold Vault & Dividends Quick Strip -->
            <div class="grid-2" style="margin-top: 6px;">
              <div class="stat-pill" style="background: var(--bg-panel); padding: 5px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
                <span class="stat-label">Rezerwy Złota w Skarbcu (Bank Centralny)</span>
                <span class="stat-value text-accent font-mono">🥇 ${goldTons} ton (${F.number(goldOz, { rawText: true })} oz)${goldCoveragePct !== null ? ` • ${goldCoveragePct.toFixed(1)}% PKB ${goldCoveragePct >= 5 ? '💪' : (goldCoveragePct < 1 && goldOz > 0 ? '⚠' : '')}` : ''}</span>
              </div>
              <div class="stat-pill" style="background: var(--bg-panel); padding: 5px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
                <span class="stat-label">Comiesięczne Dywidendy do Skarbu</span>
                <span class="stat-value text-positive font-mono">+${F.money(portfolio.monthlyDividends || 0, 'USD')}/m-c</span>
              </div>
            </div>
          </div>

          <!-- Market Category Switcher -->
          <div style="display: flex; gap: 4px; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
            <button class="map-mode-btn ${this.activeCategory === 'commodities' ? 'active' : ''}" id="tab-ex-commodities">
              🥇 Złoto i Surowce
            </button>
            <button class="map-mode-btn ${this.activeCategory === 'stocks' ? 'active' : ''}" id="tab-ex-stocks">
              🏢 Akcje Spółek (Giełda Papierów)
            </button>
          </div>

          <!-- Candlestick / Bar Chart View for Selected Asset -->
          <div class="wf-card" style="padding: 10px;">
            <div class="card-header">
              <span class="card-title">Wykres Notowań Świecowych: ${activeCommodity.icon} ${activeCommodity.name}</span>
              ${(() => {
                const ph = activeCommodity.priceHistory || [];
                const cur = activeCommodity.currentPrice;
                const prev = ph.length > 1 ? ph[ph.length - 2] : cur;
                const chg = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
                const cls = chg >= 0 ? 'text-positive' : 'text-negative';
                return `<span class="font-mono ${cls}" style="font-size: 13px; font-weight: 700;">$${window.WorldForge.Systems.Exchange.displayPrice(activeCommodity).toLocaleString('pl-PL')} <small>(${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%)</small> / ${window.WorldForge.Systems.Exchange.unitLabel(activeCommodity)}</span>`;
              })()}
            </div>
            
            <!-- Candlestick Chart SVG Canvas -->
            <div style="width: 100%; height: 120px; margin: 4px 0;">
              ${this.renderCandlestickChartSvg(activeCommodity, 400, 110)}
            </div>
          </div>

          <!-- Market Items Table -->
          ${this.activeCategory === 'commodities' ? `
            <div class="wf-card">
              <div class="card-header">
                <span class="card-title">Kruszce i Surowce Strategiczne</span>
              </div>

              <div class="wf-table-container" style="max-height: 280px;">
                <table class="wf-table">
                  <thead>
                    <tr>
                      <th>Surowiec</th>
                      <th>Kurs Spot</th>
                      <th>Posiadasz</th>
                      <th>Wartość</th>
                      <th>Zlecenie</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${exData.commodities.map(comm => {
                      const owned = portfolio.commodities?.[comm.id] || 0;
                      const val = owned * comm.currentPrice;
                      const isSelected = (comm.id === this.selectedAssetId);
                      return `
                        <tr style="background: ${isSelected ? 'var(--bg-panel-hover)' : 'transparent'}; cursor: pointer;" class="row-select-comm" data-comm-id="${comm.id}">
                          <td>
                            <strong>${comm.icon} ${comm.name}</strong>
                            <div style="font-size: 9px; color: var(--text-muted);">${window.WorldForge.Systems.Exchange.unitLabel(comm) === 't' ? 'tona (t)' : comm.unit}</div>
                          </td>
                          <td class="font-mono text-positive">$${window.WorldForge.Systems.Exchange.displayPrice(comm).toLocaleString('pl-PL')}<span style="color: var(--text-muted);"> / ${window.WorldForge.Systems.Exchange.unitLabel(comm)}</span></td>
                          <td class="font-mono">${F.number(owned, { rawText: true })}</td>
                          <td class="font-mono text-accent">${F.money(val, 'USD')}</td>
                          <td>
                            <div style="display: flex; gap: 2px;">
                              <button class="wf-btn wf-btn-sm wf-btn-primary btn-ex-buy-comm" data-comm-id="${comm.id}">
                                Kup
                              </button>
                              ${owned > 0 ? `
                                <button class="wf-btn wf-btn-sm wf-btn-secondary btn-ex-sell-comm" data-comm-id="${comm.id}">
                                  Sprzedaj
                                </button>
                              ` : ''}
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : `
            <div class="wf-card">
              <div class="card-header">
                <span class="card-title">Akcje Korporacji i Udziały Własnościowe</span>
              </div>

              <div class="wf-table-container" style="max-height: 280px;">
                <table class="wf-table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Spółka</th>
                      <th>Kurs</th>
                      <th>Dywidenda</th>
                      <th>Posiadasz</th>
                      <th>Zlecenie</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${exData.stocks.map(stk => {
                      const ownedShares = portfolio.stocks?.[stk.ticker] || 0;
                      const ownedPct = ((ownedShares / stk.sharesTotal) * 100).toFixed(1);
                      return `
                        <tr>
                          <td class="font-mono text-accent"><strong>${stk.ticker}</strong></td>
                          <td>
                            <strong>${stk.icon} ${stk.name}</strong>
                            <div style="font-size: 9px; color: var(--text-muted);">${stk.countryId} • C/Z: ${stk.peRatio}</div>
                          </td>
                          <td class="font-mono text-positive">$${stk.sharePrice.toFixed(2)}</td>
                          <td class="font-mono text-positive">${stk.dividendYield}%/r</td>
                          <td class="font-mono">
                            ${F.number(ownedShares, { rawText: true })}
                            ${ownedShares > 0 ? `<div style="font-size: 9px; color: var(--accent);">(${ownedPct}%)</div>` : ''}
                          </td>
                          <td>
                            <div style="display: flex; gap: 2px;">
                              <button class="wf-btn wf-btn-sm wf-btn-primary btn-ex-buy-stock" data-ticker="${stk.ticker}">
                                Kup
                              </button>
                              ${ownedShares > 0 ? `
                                <button class="wf-btn wf-btn-sm wf-btn-secondary btn-ex-sell-stock" data-ticker="${stk.ticker}">
                                  Sprzedaj
                                </button>
                              ` : ''}
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `}

        </div>
      `;

      this.bindEvents(container);
    },

    renderCandlestickChartSvg(item, width = 420, height = 130) {
      const fullHistory = (item.priceHistory && item.priceHistory.length > 1)
        ? item.priceHistory
        : [item.currentPrice * 0.985, item.currentPrice * 0.99, item.currentPrice];
      // Ostatnie 30 odczytów (swiece miesieczne)
      const history = fullHistory.slice(-30);
      if (history.length < 2) return '';

      const Ex = window.WorldForge.Systems.Exchange;
      const conv = Ex.isTonBased(item) ? Ex.OZ_PER_TONNE : 1;
      const fmtP = (p) => {
        const d = p * conv;
        if (d >= 1e6) return (d / 1e6).toFixed(1) + ' mln';
        if (d >= 1000) return (d / 1e3).toFixed(1) + 'k';
        return d.toFixed(conv > 1 ? 0 : 1);
      };

      const currentPrice = (item.currentPrice !== undefined) ? item.currentPrice : item.sharePrice;

      const padL = 8;
      const padR = 52; // miejsce na etykiety cen po prawej
      const padY = 10;
      const chartW = width - padL - padR;
      const chartH = height - padY * 2;

      const minPrice = Math.min(...history) * 0.985;
      const maxPrice = Math.max(...history) * 1.015;
      const range = Math.max(1e-9, maxPrice - minPrice);

      const n = history.length;
      const slot = chartW / n;
      // Świece ZAWSZE wąskie: maks. 12px i wyśrodkowane w swoim slocie
      // (przy krótkiej historii nie rozciągają się na pół ekranu)
      const barWidth = Math.min(12, Math.max(1.5, slot * 0.75));
      const gap = Math.max(1.5, (slot - barWidth) / 2);

      const yOf = (price) => padY + chartH - ((price - minPrice) / range) * chartH;

      let candlesHtml = '';
      let gridHtml = '';
      let labelsHtml = '';

      // Poziome linie: min / max / ostatnia cena
      const priceLines = [
        { price: maxPrice / 1.015, label: 'max', color: 'var(--border-light)' },
        { price: minPrice / 0.985, label: 'min', color: 'var(--border-light)' },
        { price: currentPrice, label: 'teraz', color: 'var(--accent)' }
      ];
      for (const pl of priceLines) {
        const y = Math.round(yOf(pl.price)) + 0.5;
        gridHtml += `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="${pl.color}" stroke-width="0.75" stroke-dasharray="3 3" ${pl.label === 'teraz' ? '' : 'opacity="0.6"'} />`;
        labelsHtml += `<text x="${padL + chartW + 4}" y="${y + 3}" font-size="8.5" font-family="var(--font-mono)" fill="${pl.label === 'teraz' ? 'var(--accent)' : 'var(--text-muted)'}">${fmtP(pl.price)}</text>`;
      }

      history.forEach((price, idx) => {
        const prevPrice = idx > 0 ? history[idx - 1] : price * 0.997;
        const open = prevPrice;
        const close = price;
        const high = Math.max(open, close) * (1 + 0.004 * (0.5 + Math.abs(Math.sin(idx * 7.3))));
        const low = Math.min(open, close) * (1 - 0.004 * (0.5 + Math.abs(Math.cos(idx * 5.1))));

        const up = close >= open;
        const color = up ? 'var(--positive)' : 'var(--negative)';

        const x = padL + idx * slot + gap;
        const yHigh = yOf(high);
        const yLow = yOf(low);
        const yOpen = yOf(open);
        const yClose = yOf(close);

        const candleTop = Math.min(yOpen, yClose);
        const candleHeight = Math.max(1.2, Math.abs(yClose - yOpen));

        const candleTitle = `O: ${fmtP(open)} | C: ${fmtP(close)} /${Ex.unitLabel(item)} | ${up ? '▲ +' : '▼ '}${(((close - open) / Math.max(1e-9, open)) * 100).toFixed(2)}%`;

        candlesHtml += `
          <g>
            <title>${candleTitle}</title>
            <line x1="${(x + barWidth / 2).toFixed(1)}" y1="${yHigh.toFixed(1)}" x2="${(x + barWidth / 2).toFixed(1)}" y2="${yLow.toFixed(1)}" stroke="${color}" stroke-width="0.9" opacity="0.85" />
            <rect x="${x.toFixed(1)}" y="${candleTop.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${candleHeight.toFixed(1)}" fill="${color}" stroke="${color}" stroke-width="0.5" rx="0.5" />
          </g>
        `;
      });

      // Zmiana ostatniego okresu (kolor + procent)
      const last = history[history.length - 1];
      const prev = history[history.length - 2];
      const chgPct = ((last - prev) / Math.max(1e-9, prev)) * 100;
      const chgColor = chgPct >= 0 ? 'var(--positive)' : 'var(--negative)';

      return `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="display:block; background: var(--bg-panel-secondary); border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
          ${gridHtml}
          ${candlesHtml}
          ${labelsHtml}
          <text x="${padL + 2}" y="${height - 2}" font-size="8.5" fill="var(--text-muted)">ostatnie ${n} okresów (m-c)</text>
          <text x="${padL + 2}" y="${11}" font-size="9" font-weight="700" fill="${chgColor}" font-family="var(--font-mono)">${chgPct >= 0 ? '▲ +' : '▼ '}${chgPct.toFixed(2)}%</text>
        </svg>
      `;
    },

    bindEvents(container) {
      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      container.querySelector('#tab-ex-commodities')?.addEventListener('click', () => {
        this.activeCategory = 'commodities';
        this.render(container);
      });
      container.querySelector('#tab-ex-stocks')?.addEventListener('click', () => {
        this.activeCategory = 'stocks';
        this.render(container);
      });

      container.querySelectorAll('.row-select-comm').forEach(row => {
        row.onclick = (e) => {
          if (e.target.tagName === 'BUTTON') return;
          this.selectedAssetId = row.getAttribute('data-comm-id');
          this.render(container);
        };
      });

      container.querySelectorAll('.btn-ex-buy-comm').forEach(btn => {
        btn.onclick = () => {
          const commId = btn.getAttribute('data-comm-id');
          this.showBuyCommodityDialog(country, commId, container);
        };
      });

      container.querySelectorAll('.btn-ex-sell-comm').forEach(btn => {
        btn.onclick = () => {
          const commId = btn.getAttribute('data-comm-id');
          this.showSellCommodityDialog(country, commId, container);
        };
      });

      container.querySelectorAll('.btn-ex-buy-stock').forEach(btn => {
        btn.onclick = () => {
          const ticker = btn.getAttribute('data-ticker');
          this.showBuyStockDialog(country, ticker, container);
        };
      });

      container.querySelectorAll('.btn-ex-sell-stock').forEach(btn => {
        btn.onclick = () => {
          const ticker = btn.getAttribute('data-ticker');
          this.showSellStockDialog(country, ticker, container);
        };
      });
    },

    showBuyCommodityDialog(country, commId, container) {
      const item = window.WorldForge.Core.GameState.getExchangeMarket().commodities.find(c => c.id === commId);
      if (!item) return;
      const F = window.WorldForge.Format;
      const Ex = window.WorldForge.Systems.Exchange;
      const OZ = (window.WorldForge.Data.GoldReserves && window.WorldForge.Data.GoldReserves.OZ_PER_TONNE) || 32150.7;
      const isGold = commId === 'gold';
      const defaultAmount = isGold ? 5 : 1000; // tony dla złota
      const maxOrder = Ex.maxOrderAmount(item);

      window.WorldForge.UI.Modal.show({
        title: `🥇 Zakup na Giełdzie: ${item.name}`,
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 11px; color: var(--text-secondary);">Aktualny kurs rynkowy: <strong class="font-mono text-positive">$${window.WorldForge.Systems.Exchange.displayPrice(item).toLocaleString('pl-PL')}</strong> za 1 ${Ex.unitLabel(item)}</div>
            <div class="slider-group">
              <label style="font-size: 11px; font-weight: 500;">Ilość do zakupu (${Ex.unitLabel(item)}):</label>
              <input type="number" id="ex-buy-amount" class="wf-input font-mono" value="${defaultAmount}" min="${isGold ? 0.5 : 1}" step="${isGold ? 0.5 : 100}" />
              <span style="font-size: 10px; color: var(--text-muted);">Środki w Skarbie: ${F.money(country.treasury, 'USD')}</span>
            </div>
            <div id="ex-buy-preview" style="background: var(--bg-panel-secondary); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px; font-size: 11px;"></div>
            ${isGold ? `<div style="font-size: 10px; color: var(--text-muted);">Głębokość rynku: bezbolesna absorpcja to ~150 t/mies.; maks. zlecenie to ${Ex.fmtQty(item, maxOrder)} — większy zrzut jednym zleceniem może załamać rynek (i Ciebie z nim).</div>` : ''}
          </div>
        `,
        buttons: [
          { text: 'Anuluj', class: 'wf-btn-secondary', autoClose: true },
          {
            text: 'Zrealizuj Zlecenie Kupna',
            class: 'wf-btn-primary',
            autoClose: true,
            onClick: () => {
              const oz = Ex.inputToOz(item, document.getElementById('ex-buy-amount')?.value || defaultAmount);
              const res = Ex.buyCommodity(country, commId, oz);
              if (!res.success) {
                window.WorldForge.UI.Modal.showError('Transakcja Giełdowa Nieudana', res.reason);
              }
              window.WorldForge.UI.Navigation.updateTopBar();
              this.render(container);
            }
          }
        ]
      });

      const input = document.getElementById('ex-buy-amount');
      const preview = document.getElementById('ex-buy-preview');
      const updatePreview = () => {
        const oz = Ex.inputToOz(item, input?.value || 0);
        const impact = Ex.computeDepthImpact(item, oz);
        const execPricePerUnit = Ex.displayPrice(item) * (1 + impact);
        const total = Math.round(oz * item.currentPrice * (1 + impact));
        if (preview) {
          preview.innerHTML = `
            <div style="display:flex; justify-content: space-between;"><span>Szacowana cena wykonania:</span><strong class="font-mono text-negative">$${execPricePerUnit.toLocaleString('pl-PL')}/${Ex.unitLabel(item)} ${impact > 0.005 ? `(+${(impact * 100).toFixed(1)}% wpływ)` : '(rynkowa)'}</strong></div>
            <div style="display:flex; justify-content: space-between;"><span>Łączny koszt:</span><strong class="font-mono">${F.money(total, 'USD')}</strong></div>
            ${oz > maxOrder ? `<div class="text-negative" style="margin-top:4px;">⚠ Przekroczono limit zlecenia (${Ex.fmtQty(item, maxOrder)}) — rynek odrzuci.</div>` : ''}
          `;
        }
      };
      input?.addEventListener('input', updatePreview);
      updatePreview();
    },

    showSellCommodityDialog(country, commId, container) {
      const item = window.WorldForge.Core.GameState.getExchangeMarket().commodities.find(c => c.id === commId);
      const owned = country.portfolio?.commodities?.[commId] || 0;
      if (!item || owned <= 0) return;

      const F = window.WorldForge.Format;
      const Ex = window.WorldForge.Systems.Exchange;
      const OZ = (window.WorldForge.Data.GoldReserves && window.WorldForge.Data.GoldReserves.OZ_PER_TONNE) || 32150.7;
      const isGold = commId === 'gold';
      const maxOrder = Ex.maxOrderAmount(item);

      window.WorldForge.UI.Modal.show({
        title: `Sprzedaż: ${item.name}`,
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 11px; color: var(--text-secondary);">
              Posiadasz: <strong class="font-mono text-accent">${isGold ? `${(owned / OZ).toFixed(1)} t rezerw narodowych` : `${F.number(owned, { rawText: true })} ${Ex.unitLabel(item)}`}</strong>
              ${isGold ? ` <span style="color: var(--text-muted);">(${F.number(owned, { rawText: true })} oz)</span>` : ''}
            </div>
            <div class="slider-group">
              <label style="font-size: 11px; font-weight: 500;">Ilość do sprzedaży (${Ex.unitLabel(item)}):</label>
              <input type="number" id="ex-sell-amount" class="wf-input font-mono" value="${isGold ? Math.min(+((Math.min(owned, maxOrder) / OZ).toFixed(1)), +((owned / OZ).toFixed(1))) : Math.min(owned, maxOrder)}" min="${isGold ? 0.1 : 1}" max="${isGold ? (owned / OZ).toFixed(1) : owned}" step="${isGold ? 0.5 : 100}" />
            </div>
            <div id="ex-sell-preview" style="background: var(--bg-panel-secondary); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px; font-size: 11px;"></div>
            <div id="ex-sell-warning"></div>
          </div>
        `,
        buttons: [
          { text: 'Anuluj', class: 'wf-btn-secondary', autoClose: true },
          {
            text: 'Sprzedaj',
            class: 'wf-btn-primary',
            autoClose: true,
            onClick: () => {
              const amount = Ex.inputToOz(item, document.getElementById('ex-sell-amount')?.value || owned);
              // Ostrzeżenie o wyprzedaży rezerw narodowych (>5% rezerw złota)
              if (isGold && amount > owned * 0.05) {
                this.confirmGoldReserveSale(country, item, amount, owned, OZ, container);
              } else {
                const res = Ex.sellCommodity(country, commId, amount);
                if (!res.success) {
                  window.WorldForge.UI.Modal.showError('Transakcja Giełdowa Nieudana', res.reason);
                }
                window.WorldForge.UI.Navigation.updateTopBar();
                this.render(container);
              }
            }
          }
        ]
      });

      const input = document.getElementById('ex-sell-amount');
      const preview = document.getElementById('ex-sell-preview');
      const warnEl = document.getElementById('ex-sell-warning');
      const updatePreview = () => {
        const oz = Ex.inputToOz(item, input?.value || 0);
        const impact = Ex.computeDepthImpact(item, oz);
        const execPricePerUnit = Ex.displayPrice(item) * (1 - impact);
        const proceeds = Math.round(oz * item.currentPrice * (1 - impact));
        if (preview) {
          preview.innerHTML = `
            <div style="display:flex; justify-content: space-between;"><span>Szacowana cena wykonania:</span><strong class="font-mono text-negative">$${execPricePerUnit.toLocaleString('pl-PL')}/${Ex.unitLabel(item)} ${impact > 0.005 ? `(-${(impact * 100).toFixed(1)}% wpływ)` : '(rynkowa)'}</strong></div>
            <div style="display:flex; justify-content: space-between;"><span>Wpływ do Skarbu:</span><strong class="font-mono text-positive">${F.money(proceeds, 'USD')}</strong></div>
            ${oz > maxOrder ? `<div class="text-negative" style="margin-top:4px;">⚠ Limit zlecenia: ${Ex.fmtQty(item, maxOrder)} — sprzedawaj partiami.</div>` : ''}
          `;
        }
        if (warnEl && isGold && oz > owned * 0.05) {
          const share = ((oz / owned) * 100).toFixed(0);
          warnEl.innerHTML = `<div style="background: var(--warning-bg); border: 1px solid var(--warning-border); color: var(--warning); border-radius: var(--border-radius-xs); padding: 7px 9px; font-size: 10.5px; line-height: 1.45;">
            ⚠ Sprzedajesz <strong>${share}% rezerw narodowych</strong>. Rezerwy podpierają kurs Twojej waluty i rating kredytowy — większa wyprzedaż (kumulatywnie >20%/12 m-cy) osłabi kurs i podniesie inflację, a >80% wywoła Kryzys Zaufania do Waluty.
          </div>`;
        } else if (warnEl) warnEl.innerHTML = '';
      };
      input?.addEventListener('input', updatePreview);
      updatePreview();
    },

    /** Potwierdzenie sprzedaży znacznej części rezerw złota (drugi stopień ostrzeżenia). */
    confirmGoldReserveSale(country, item, amount, owned, OZ, container) {
      const F = window.WorldForge.Format;
      const Ex = window.WorldForge.Systems.Exchange;
      const impact = Ex.computeDepthImpact(item, amount);
      const execPrice = item.currentPrice * (1 - impact);
      const proceeds = Math.round(amount * execPrice);
      const share = (amount / owned) * 100;

      window.WorldForge.UI.Modal.show({
        title: '⚠ Potwierdź Sprzedaż Rezerw Złota',
        contentHtml: `
          <div style="display:flex; flex-direction: column; gap: 8px; font-size: 11.5px; color: var(--text-secondary); line-height: 1.5;">
            <p style="margin:0;">Zlecenie: <strong>${(amount / OZ).toFixed(1)} t</strong> — <strong class="text-warning">${share.toFixed(0)}% rezerw narodowych</strong>.</p>
            <p style="margin:0;">Szacowana cena po Twoim zleceniu: <strong class="font-mono text-negative">$${(execPrice * OZ / 1000000).toFixed(1)} mln/t</strong> (rynkowa: $${(item.currentPrice * OZ / 1000000).toFixed(1)} mln/t). Wpływ do skarbca: <strong class="font-mono">${F.money(proceeds, 'USD')}</strong>.</p>
            <p style="margin:0; color: var(--warning);">Rezerwy złota podpierają kurs waluty, inflację i rating państwa. Kumulatywna wyprzedaż ponad 20% rocznie osłabi złotego, ponad 50% — mocno podbije inflację, a ponad 80% wywoła kryzys zaufania do waluty (do +8 pp inflacji, spadek stabilności).</p>
          </div>
        `,
        buttons: [
          { text: 'Anuluj', class: 'wf-btn-secondary', autoClose: true },
          {
            text: 'Rozumiem ryzyko — sprzedaj',
            class: 'wf-btn-danger',
            autoClose: true,
            onClick: () => {
              const res = Ex.sellCommodity(country, 'gold', amount);
              if (!res.success) {
                window.WorldForge.UI.Modal.showError('Transakcja Giełdowa Nieudana', res.reason);
              }
              window.WorldForge.UI.Navigation.updateTopBar();
              this.render(container);
            }
          }
        ]
      });
    },

    showBuyStockDialog(country, ticker, container) {
      const stock = window.WorldForge.Core.GameState.getExchangeMarket().stocks.find(s => s.ticker === ticker);
      if (!stock) return;

      window.WorldForge.UI.Modal.show({
        title: `Kupno Akcji: ${stock.name} (${stock.ticker})`,
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 11px; color: var(--text-secondary);">Cena 1 akcji: <strong class="font-mono text-positive">$${stock.sharePrice.toFixed(2)}</strong> • Dywidenda: <strong class="text-positive">${stock.dividendYield}%/rok</strong></div>
            <div class="slider-group">
              <label style="font-size: 11px; font-weight: 500;">Liczba akcji do zakupu:</label>
              <input type="number" id="stock-buy-shares" class="wf-input font-mono" value="10000000" min="10000" step="100000" />
            </div>
          </div>
        `,
        buttons: [
          { text: 'Anuluj', class: 'wf-btn-secondary', autoClose: true },
          {
            text: 'Kup Akcje',
            class: 'wf-btn-primary',
            autoClose: true,
            onClick: () => {
              const shares = parseFloat(document.getElementById('stock-buy-shares')?.value || 10000000);
              const res = window.WorldForge.Systems.Exchange.buyStock(country, ticker, shares);
              if (!res.success) {
                window.WorldForge.UI.Modal.showError('Zakup Akcji Nieudany', res.reason);
              }
              window.WorldForge.UI.Navigation.updateTopBar();
              this.render(container);
            }
          }
        ]
      });
    },

    showSellStockDialog(country, ticker, container) {
      const stock = window.WorldForge.Core.GameState.getExchangeMarket().stocks.find(s => s.ticker === ticker);
      const owned = country.portfolio?.stocks?.[ticker] || 0;
      if (!stock || owned <= 0) return;

      window.WorldForge.UI.Modal.show({
        title: `Sprzedaż Akcji: ${stock.name} (${stock.ticker})`,
        contentHtml: `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 11px; color: var(--text-secondary);">Posiadasz: <strong class="font-mono text-accent">${window.WorldForge.Format.number(owned, { rawText: true })} akcji</strong></div>
            <div class="slider-group">
              <label style="font-size: 11px; font-weight: 500;">Liczba akcji do sprzedaży:</label>
              <input type="number" id="stock-sell-shares" class="wf-input font-mono" value="${owned}" min="1" max="${owned}" />
            </div>
          </div>
        `,
        buttons: [
          { text: 'Anuluj', class: 'wf-btn-secondary', autoClose: true },
          {
            text: 'Sprzedaj',
            class: 'wf-btn-primary',
            autoClose: true,
            onClick: () => {
              const shares = parseFloat(document.getElementById('stock-sell-shares')?.value || owned);
              window.WorldForge.Systems.Exchange.sellStock(country, ticker, shares);
              window.WorldForge.UI.Navigation.updateTopBar();
              this.render(container);
            }
          }
        ]
      });
    }
  };

  window.WorldForge.UI.Exchange = ExchangeUI;
})();
