/**
 * WorldForge: Nations - Economy & Industry Factory Manager UI
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const EconomyUI = {
    render(container) {
      if (!container) return;

      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      const F = window.WorldForge.Format;
      const eco = country.economy;
      const biz = country.businesses;
      const hh = country.households;
      const factories = country.factories || [];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Key Macro Metrics Grid -->
          <div class="grid-2">
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Wzrost PKB (r/r)</span>
              <span class="stat-value ${eco.gdpGrowthYoY >= 0 ? 'text-positive' : 'text-negative'}">
                ${eco.gdpGrowthYoY > 0 ? '+' : ''}${eco.gdpGrowthYoY.toFixed(2)}%
              </span>
              <span style="font-size: 10px; color: var(--text-muted);">PKB Realne: ${F.money(eco.gdpReal, 'USD')}</span>
            </div>

            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Stopa Bezrobocia</span>
              <span class="stat-value ${eco.unemployment > 8 ? 'text-negative' : 'text-accent'}">
                ${eco.unemployment.toFixed(1)}%
              </span>
              <span style="font-size: 10px; color: var(--text-muted);">Pracujący: ${F.population(country.population.workforceTotal * (1 - eco.unemployment / 100))}</span>
            </div>

            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Średnie Wynagrodzenie</span>
              <span class="stat-value text-accent">
                ${F.money(eco.averageMonthlyWage, country.currency)}
              </span>
              <span style="font-size: 10px; color: var(--text-muted);">Wskaźnik wydajności: ${eco.productivityIndex.toFixed(0)} pkt</span>
            </div>

            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Nierówności Społeczne (Gini)</span>
              <span class="stat-value">
                ${eco.giniInequality.toFixed(1)}
              </span>
              <span style="font-size: 10px; color: var(--text-muted);">Poparcie rządu: ${eco.socialApproval.toFixed(0)}%</span>
            </div>
          </div>

          <!-- Industrial Plants & Factory Management System -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">🏭 Zakłady Przemysłowe i Fabryki (${factories.length})</span>
              <button class="wf-btn wf-btn-sm wf-btn-primary" id="btn-open-build-factory-modal">+ Wybuduj Fabrykę</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto;">
              ${factories.length > 0 ? factories.map(fac => {
                const isBuilding = (fac.status === 'BUILDING');
                const isPaused = (fac.status === 'PAUSED');
                return `
                  <div style="background: var(--bg-panel); border: 1px solid ${fac.isMine ? 'var(--warning-border)' : 'var(--border)'}; border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight: 600; font-size: 11px;">
                        ${fac.name} ${fac.level > 1 ? `<span class="wf-badge wf-badge-cyan">Poz. ${fac.level}</span>` : ''} ${fac.isMine ? '<span class="wf-badge wf-badge-amber">KOPALNIA ZŁOTA</span>' : ''}
                      </div>
                      <div style="font-size: 10px; color: var(--text-muted);">
                        ${fac.isMine
                          ? `Wydobycie: <strong class="text-accent">${fac.capacityBoost} t złota/rok</strong> • Koszt AISC: $${(fac.aiscPerOz || 1900).toLocaleString('pl-PL')}/oz • Pracownicy: ${fac.workersEmployed}`
                          : `Sektor: <strong class="text-accent">${fac.sector}</strong> • Zdolności: +${fac.capacityBoost} • Pracownicy: ${fac.workersEmployed} • ${fac.ownership === 'PRIVATE' ? '🏭 Prywatny' : '🏛️ Państwowy'}`}
                      </div>
                      ${fac.isMine && !isBuilding && !isPaused && fac.lastMonthlyOz > 0 ? `
                        <div style="font-size: 10px; color: var(--positive); margin-top: 2px;">
                          ⛏️ Wydobycie: <strong class="font-mono">${(fac.lastMonthlyOz / 32150.7).toFixed(1)} t/m-c do rezerw</strong> • Wynik operacyjny: <strong class="font-mono ${fac.lastMonthlyProfit >= 0 ? 'text-positive' : 'text-negative'}">${F.money(fac.lastMonthlyProfit, 'USD')}/m-c</strong> (koszt: ${F.money(fac.lastMonthlyCost || 0, 'USD')})
                        </div>
                      ` : ''}
                      ${!fac.isMine && !isBuilding && fac.ownership !== 'PRIVATE' && fac.lastMonthlyProfit > 0 ? `
                        <div style="font-size: 10px; color: var(--positive); margin-top: 2px;">
                          💰 Dywidenda: <strong class="font-mono">${F.money(fac.lastMonthlyProfit, 'USD')}/m-c</strong>
                          ${fac.lastMonthlySurplus ? `• 📦 Nadwyżka do magazynu: <strong class="font-mono">${fac.lastMonthlySurplus}</strong> jedn./m-c` : ''}
                        </div>
                      ` : ''}
                      ${isBuilding ? `
                        <div style="font-size: 10px; color: var(--warning); margin-top: 2px;">
                          W budowie (pozostało ${fac.remainingMonths} m-cy)
                        </div>
                      ` : ''}
                      ${isPaused ? `
                        <div style="font-size: 10px; color: var(--negative); margin-top: 2px;">
                          ⏸ Wydobycie wstrzymane
                        </div>
                      ` : ''}
                    </div>
                    <div style="display: flex; gap: 4px; flex-direction: column; align-items: flex-end;">
                      ${!isBuilding && fac.isMine ? `
                        <button class="wf-btn wf-btn-sm ${isPaused ? 'wf-btn-success' : 'wf-btn-secondary'} btn-toggle-mine" data-fac-id="${fac.id}">
                          ${isPaused ? '▶ Wznów' : '⏸ Wstrzymaj'}
                        </button>
                      ` : ''}
                      ${!isBuilding && fac.level < 5
                        ? `
                        <button class="wf-btn wf-btn-sm wf-btn-secondary btn-upgrade-factory" data-fac-id="${fac.id}" title="Koszt modernizacji do poziomu ${fac.level + 1}">
                          Modernizuj • ${F.money(Math.round(300000000 * Math.pow(1.5, fac.level - 1)), 'USD')}
                        </button>` : (!isBuilding ? '<span class="wf-badge wf-badge-cyan" title="Osiągnięto maksymalny poziom">MAX</span>' : '')}
                    </div>
                  </div>
                `;
              }).join('') : '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 12px;">Brak wybudowanych fabryk państwowych. Rozpocznij budowę nowego zakładu.</div>'}
            </div>
          </div>

          <!-- Enterprise Sector & Capacity -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Kondycja Sektora Przedsiębiorstw</span>
              <span class="wf-badge wf-badge-cyan">${F.population(biz.activeEnterprises)} firm</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between;">
                <span>Wykorzystanie Mocy:</span>
                <strong class="font-mono ${biz.capacityUtilization > 75 ? 'text-positive' : 'text-warning'}">${biz.capacityUtilization.toFixed(1)}%</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Średnia Marża Zysku:</span>
                <strong class="font-mono text-positive">${biz.averageProfitMargin.toFixed(1)}%</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Inwestycje Capex:</span>
                <strong class="font-mono text-accent">${F.money(biz.corporateCapex, 'USD')}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Upadłości / Miesiąc:</span>
                <strong class="font-mono text-negative">${biz.monthlyBankruptcies} firm</strong>
              </div>
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container);
    },

    bindEvents(container) {
      const countryId = window.WorldForge.Core.GameState.state.playerCountryId;

      // Open build factory modal
      container.querySelector('#btn-open-build-factory-modal')?.addEventListener('click', () => {
        this.showBuildFactoryModal();
      });

      // Upgrade factory
      container.querySelectorAll('.btn-upgrade-factory').forEach(btn => {
        btn.onclick = () => {
          const factoryId = btn.getAttribute('data-fac-id');
          window.WorldForge.Core.Commands.dispatch({
            type: 'EXPAND_FACTORY',
            countryId,
            payload: { factoryId }
          });
          this.render(container);
        };
      });

      // Pause / resume gold mine
      container.querySelectorAll('.btn-toggle-mine').forEach(btn => {
        btn.onclick = () => {
          const res = window.WorldForge.Core.Commands.dispatch({
            type: 'MINE_TOGGLE',
            countryId,
            payload: { mineId: btn.getAttribute('data-fac-id') }
          });
          if (!res.success) {
            window.WorldForge.UI.Modal.showError('Operacja Niemożliwa', res.reason);
          }
          this.render(container);
        };
      });
    },

    showBuildFactoryModal() {
      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      const factoryTypes = window.WorldForge.Data.FactoryTypes || [];
      const F = window.WorldForge.Format;

      const modalHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 430px; overflow-y: auto;">
          <p style="font-size: 11px; color: var(--text-secondary);">
            Wybierz typ zakładu przemysłowego do budowy w Twoim państwie:
          </p>

          <div style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px;">
            <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 4px;">Model własności:</label>
            <select id="factory-ownership-select" class="wf-select" style="width: 100%;">
              <option value="STATE" selected>🏛️ Państwowy (100% kosztu • miesięczna dywidenda dla Skarbu)</option>
              <option value="PRIVATE">🏭 Prywatny (55% kosztu • brak dywidendy • szybszy rozwój gospodarczy)</option>
            </select>
          </div>

          ${factoryTypes.map(ft => {
            const resMeta = (window.WorldForge.Data.Resources || []).find(r => r.id === ft.sector);
            const price = (window.WorldForge.Core.GameState.getState().globalMarket?.prices?.[ft.sector]) || (resMeta ? resMeta.basePrice : 150);
            const estProfit = Math.round(ft.capacityBoost * 0.785 * price * 1000 * 0.05);
            const goldPrice = window.WorldForge.Core.GameState.getExchangeMarket().commodities.find(c => c.id === 'gold')?.currentPrice || 4500;
            const mineAnnualOz = ft.isMine ? Math.round((ft.capacityBoost / 12) * 0.78 * 32150.7 * 12) : 0;
            const mineAnnualProfit = ft.isMine ? Math.round(mineAnnualOz * (goldPrice - (ft.aiscPerOz || 1900))) : 0;
            return `
            <div style="background: var(--bg-panel-secondary); border: 1px solid ${ft.isMine ? 'var(--warning-border)' : 'var(--border)'}; border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 12px; color: var(--text-primary);">${ft.icon} ${ft.name}</strong>
                <div style="font-size: 10px; color: var(--text-muted);">${ft.description}</div>
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                  Koszt: <strong class="text-positive build-cost" id="build-cost-${ft.id}">${F.money(ft.cost, 'USD')}</strong> • Czas budowy: <strong>${ft.constructionMonths} m-cy</strong> • Miejsca pracy: <strong>${ft.workersNeeded}</strong>
                </div>
                ${ft.isMine ? `
                <div style="font-size: 10px; color: var(--accent); margin-top: 2px;">
                  ⛏️ Wydobycie: <strong>${ft.capacityBoost} t/rok</strong> (po modernizacjach do <strong>${Math.round(ft.capacityBoost * Math.pow(1.5, 4))} t/rok</strong>) • Zysk operacyjny @ $${goldPrice.toFixed(0)}: <strong class="font-mono">${F.money(mineAnnualProfit, 'USD')}/rok</strong> • zwrot: ~${Math.max(1, Math.ceil(ft.cost / Math.max(1, mineAnnualProfit)))} lat
                </div>
                <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 1px;">
                  Złoto trafia do REZERW PAŃSTWA (nie na rynek) — sprzedaż ruszy ceną dopiero na giełdzie.
                </div>
                ` : `
                <div style="font-size: 10px; color: var(--accent); margin-top: 2px;">
                  💰 Szacowana dywidenda państwowa: <strong class="font-mono">${F.money(estProfit, 'USD')}/m-c</strong> (zwrot inwestycji: ~${Math.ceil(ft.cost / Math.max(1, estProfit))} m-cy od oddania)
                </div>
                `}
              </div>
              <button class="wf-btn wf-btn-sm wf-btn-primary btn-submit-build-factory" data-type-id="${ft.id}">
                Wybuduj
              </button>
            </div>
          `; }).join('')}
        </div>
      `;

      window.WorldForge.UI.Modal.show({
        title: '🏭 Budowa Nowego Zakładu Przemysłowego',
        contentHtml: modalHtml,
        buttons: [{ text: 'Zamknij', class: 'wf-btn-secondary', autoClose: true }]
      });

      // Zmiana modelu własności aktualizuje KOSZT na karcie (prywatny = 55%),
      // przycisk pozostaje czysty — bez cen i nawiasów w etykiecie.
      const updateCosts = () => {
        const ownership = document.getElementById('factory-ownership-select')?.value || 'STATE';
        factoryTypes.forEach(ft => {
          const el = document.getElementById('build-cost-' + ft.id);
          if (!el) return;
          el.innerHTML = (ownership === 'PRIVATE')
            ? `${F.money(Math.round(ft.cost * 0.55), 'USD')} <span style="font-weight:400; color: var(--text-muted);">(współfinansowanie prywatne)</span>`
            : F.money(ft.cost, 'USD');
        });
      };
      document.getElementById('factory-ownership-select')?.addEventListener('change', updateCosts);
      updateCosts();

      document.querySelectorAll('.btn-submit-build-factory').forEach(btn => {
        btn.onclick = () => {
          const typeId = btn.getAttribute('data-type-id');
          const ownership = document.getElementById('factory-ownership-select')?.value || 'STATE';
          const res = window.WorldForge.Core.Commands.dispatch({
            type: 'BUILD_FACTORY',
            countryId: country.id,
            payload: { factoryTypeId: typeId, ownership }
          });
          if (!res.success) {
            window.WorldForge.UI.Modal.showError('Budowa Fabryki Niemożliwa', res.reason);
          }
          window.WorldForge.UI.Modal.close();
          const drawerContent = document.getElementById('right-drawer-content');
          if (drawerContent) EconomyUI.render(drawerContent);
        };
      });
    }
  };

  window.WorldForge.UI.Economy = EconomyUI;
})();
