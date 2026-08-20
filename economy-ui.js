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
                return `
                  <div style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight: 600; font-size: 11px;">
                        ${fac.name} ${fac.level > 1 ? `<span class="wf-badge wf-badge-cyan">Poz. ${fac.level}</span>` : ''}
                      </div>
                      <div style="font-size: 10px; color: var(--text-muted);">
                        Sektor: <strong class="text-accent">${fac.sector}</strong> • Zdolności: +${fac.capacityBoost} • Pracownicy: ${fac.workersEmployed}
                      </div>
                      ${isBuilding ? `
                        <div style="font-size: 10px; color: var(--warning); margin-top: 2px;">
                          W budowie (pozostało ${fac.remainingMonths} m-cy)
                        </div>
                      ` : ''}
                    </div>
                    <div>
                      ${!isBuilding ? `
                        <button class="wf-btn wf-btn-sm wf-btn-secondary btn-upgrade-factory" data-fac-id="${fac.id}">
                          Modernizuj ($300M)
                        </button>
                      ` : ''}
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
    },

    showBuildFactoryModal() {
      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      const factoryTypes = window.WorldForge.Data.FactoryTypes || [];
      const F = window.WorldForge.Format;

      const modalHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
          <p style="font-size: 11px; color: var(--text-secondary);">
            Wybierz typ zakładu przemysłowego do budowy w Twoim państwie:
          </p>

          ${factoryTypes.map(ft => `
            <div style="background: var(--bg-panel-secondary); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 12px; color: var(--text-primary);">${ft.icon} ${ft.name}</strong>
                <div style="font-size: 10px; color: var(--text-muted);">${ft.description}</div>
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                  Koszt: <strong class="text-positive">${F.money(ft.cost, 'USD')}</strong> • Czas budowy: <strong>${ft.constructionMonths} m-cy</strong> • Miejsca pracy: <strong>${ft.workersNeeded}</strong>
                </div>
              </div>
              <button class="wf-btn wf-btn-sm wf-btn-primary btn-submit-build-factory" data-type-id="${ft.id}">
                Wybuduj
              </button>
            </div>
          `).join('')}
        </div>
      `;

      window.WorldForge.UI.Modal.show({
        title: '🏭 Budowa Nowego Zakładu Przemysłowego',
        contentHtml: modalHtml,
        buttons: [{ text: 'Zamknij', class: 'wf-btn-secondary', autoClose: true }]
      });

      document.querySelectorAll('.btn-submit-build-factory').forEach(btn => {
        btn.onclick = () => {
          const typeId = btn.getAttribute('data-type-id');
          const res = window.WorldForge.Core.Commands.dispatch({
            type: 'BUILD_FACTORY',
            countryId: country.id,
            payload: { factoryTypeId: typeId }
          });
          if (!res.success) {
            alert('Nie można wybudować fabryki: ' + res.reason);
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
