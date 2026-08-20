/**
 * WorldForge: Nations - State Budget & Fiscal Management UI
 * Accurately synchronized with tax & budget simulation systems, live dragging and auto-balance.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const BudgetUI = {
    pendingSpending: null,
    pendingTaxes: null,

    render(container) {
      if (!container) return;

      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      const F = window.WorldForge.Format;
      const budget = country.budget;
      const spending = this.pendingSpending || { ...budget.spending };
      const taxes = this.pendingTaxes || { ...country.taxes };

      this.pendingSpending = spending;
      this.pendingTaxes = taxes;

      const spendingCategories = [
        { key: 'health', name: 'Ochrona Zdrowia', desc: 'Szpitale, refundacje leków, kadry medyczne' },
        { key: 'education', name: 'Edukacja i Szkolnictwo', desc: 'Szkoły, pensje nauczycieli i uczelnie' },
        { key: 'pensions', name: 'Emerytury i Renty (FUS)', desc: 'Świadczenia emerytalne (wydatek sztywny)' },
        { key: 'socialWelfare', name: 'Pomoc Społeczna i Rodziny', desc: 'Zasiłki, programy socjalne' },
        { key: 'defense', name: 'Obronność i Wojsko', desc: 'Utrzymanie armii i zakupy sprzętu' },
        { key: 'infrastructure', name: 'Infrastruktura i Transport', desc: 'Utrzymanie dróg, torów i portów' },
        { key: 'energy', name: 'Energetyka i Sieci', desc: 'Transformacja KSE i dotacje do mocy' },
        { key: 'research', name: 'Badania i Rozwój (B+R)', desc: 'Granty dla instytutów naukowych' },
        { key: 'publicSafety', name: 'Policja i Bezpieczeństwo', desc: 'Policja, straż pożarna, służby' },
        { key: 'administration', name: 'Administracja i Sądy', desc: 'Urzędy centralne i sądownictwo' },
        { key: 'environment', name: 'Ochrona Środowiska', desc: 'Gospodarka wodna i walka ze smogiem' },
        { key: 'subsidies', name: 'Dotacje Gospodarcze', desc: 'Dopłaty dla przemysłu i rolnictwa' }
      ];

      // Exact live projected revenues and spending calculation
      const monthlyGdp = country.economy.gdpNominal / 12;
      const eff = taxes.efficiency / 100;
      const legal = 1 - (taxes.greyEconomyShare / 100);

      const projVat = Math.round(monthlyGdp * 0.55 * (taxes.vatRate / 100) * eff * legal);
      const projPit = Math.round(monthlyGdp * 0.40 * (taxes.pitRate / 100) * eff * legal);
      const projCit = Math.round(monthlyGdp * 0.16 * (taxes.citRate / 100) * eff);
      const projSocial = Math.round(monthlyGdp * 0.40 * (taxes.socialContributionRate / 100) * eff * 0.95);
      const projExcise = Math.round(monthlyGdp * 0.022 * (taxes.exciseRate / 15) * eff);
      const projOther = Math.round(monthlyGdp * 0.025);

      const projectedRevenuesMonthly = projVat + projPit + projCit + projSocial + projExcise + projOther;

      const baselinePublicMonthly = monthlyGdp * 0.28;
      let projectedPrimarySpending = 0;
      for (const cat of spendingCategories) {
        projectedPrimarySpending += Math.round(baselinePublicMonthly * ((spending[cat.key] || 6.5) / 100));
      }
      const debtCost = country.debt.monthlyInterestCost || spending.debtServicing || 0;
      const projectedSpendingMonthly = projectedPrimarySpending + debtCost;
      const projectedBalanceMonthly = projectedRevenuesMonthly - projectedSpendingMonthly;

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          
          <!-- Top Financial Overview Cards with Live Projection -->
          <div class="grid-2">
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Dochody [Miesięcznie]</span>
              <span class="stat-value text-positive" id="live-proj-revenue">${F.money(projectedRevenuesMonthly, 'USD')}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Wydatki [Miesięcznie]</span>
              <span class="stat-value text-negative" id="live-proj-spending">${F.money(projectedSpendingMonthly, 'USD')}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Saldo [Miesięcznie]</span>
              <span class="stat-value" id="live-proj-balance">${F.delta(projectedBalanceMonthly, false, 'USD')}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Skarb Państwa [Całkowity]</span>
              <span class="stat-value text-accent">${F.money(country.treasury, 'USD')}</span>
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="wf-btn wf-btn-sm wf-btn-primary" id="btn-auto-balance-budget" title="Automatycznie zoptymalizuj wydatki i podatki w celu uzyskania bezpiecznej nadwyżki">
              ⚖️ Zrównoważ Budżet
            </button>
            <button class="wf-btn wf-btn-sm wf-btn-success" id="btn-apply-budget-plan">
              ✓ Zastosuj Zmiany
            </button>
            <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-revert-budget-plan">
              ⟲ Cofnij Zmiany
            </button>
          </div>

          <!-- Revenue Breakdown Table -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Struktura Dochodów Podatkowych [Miesięcznie]</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between;">
                <span>VAT (Konsumpcja):</span>
                <strong class="font-mono text-positive">${F.money(projVat, 'USD')}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>PIT (Dochodowy od osób):</span>
                <strong class="font-mono text-positive">${F.money(projPit, 'USD')}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>CIT (Przedsiębiorstwa):</span>
                <strong class="font-mono text-positive">${F.money(projCit, 'USD')}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Składki Społeczne (ZUS):</span>
                <strong class="font-mono text-positive">${F.money(projSocial, 'USD')}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Akcyza i Cła Handlowe:</span>
                <strong class="font-mono text-positive">${F.money(projExcise + projOther, 'USD')}</strong>
              </div>
            </div>
          </div>

          <!-- Tax Rates Sliders -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Stawki Podatkowe</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div class="slider-group">
                <div class="slider-header">
                  <span>Stawka VAT:</span>
                  <span class="font-mono text-accent" id="val-tax-vatRate">${taxes.vatRate.toFixed(1)}%</span>
                </div>
                <input type="range" class="wf-slider tax-slider" data-tax="vatRate" min="5" max="32" step="0.5" value="${taxes.vatRate}" />
              </div>

              <div class="slider-group">
                <div class="slider-header">
                  <span>Stawka PIT:</span>
                  <span class="font-mono text-accent" id="val-tax-pitRate">${taxes.pitRate.toFixed(1)}%</span>
                </div>
                <input type="range" class="wf-slider tax-slider" data-tax="pitRate" min="5" max="45" step="0.5" value="${taxes.pitRate}" />
              </div>

              <div class="slider-group">
                <div class="slider-header">
                  <span>Stawka CIT:</span>
                  <span class="font-mono text-accent" id="val-tax-citRate">${taxes.citRate.toFixed(1)}%</span>
                </div>
                <input type="range" class="wf-slider tax-slider" data-tax="citRate" min="5" max="35" step="0.5" value="${taxes.citRate}" />
              </div>

              <!-- Uszczelnianie -->
              <div style="border-top: 1px solid var(--border); padding-top: 6px; margin-top: 2px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 11px; font-weight: 500;">Uszczelnianie VAT i E-Faktury</div>
                  <div style="font-size: 10px; color: var(--text-muted);">Szara strefa: ${taxes.greyEconomyShare.toFixed(1)}% • Efektywność: ${taxes.efficiency.toFixed(1)}%</div>
                </div>
                <button class="wf-btn wf-btn-sm wf-btn-primary" id="btn-invest-tax-digital">
                  Inwestuj $100M
                </button>
              </div>
            </div>
          </div>

          <!-- Expenditures Allocation Sliders -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Alokacja Wydatków Publicznych</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${spendingCategories.map(cat => {
                const val = spending[cat.key] || 6.5;
                return `
                  <div class="slider-group">
                    <div class="slider-header">
                      <span style="font-weight: 500;">${cat.name}</span>
                      <span class="font-mono text-accent" id="val-spending-${cat.key}">${val.toFixed(1)}%</span>
                    </div>
                    <input type="range" class="wf-slider budget-slider" data-cat="${cat.key}" min="1" max="30" step="0.5" value="${val}" />
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container);
    },

    bindEvents(container) {
      const countryId = window.WorldForge.Core.GameState.state.playerCountryId;
      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      const F = window.WorldForge.Format;

      const recalculateLiveProjections = () => {
        const monthlyGdp = country.economy.gdpNominal / 12;
        const taxes = this.pendingTaxes;
        const spending = this.pendingSpending;
        const eff = taxes.efficiency / 100;
        const legal = 1 - (taxes.greyEconomyShare / 100);

        const projVat = Math.round(monthlyGdp * 0.55 * (taxes.vatRate / 100) * eff * legal);
        const projPit = Math.round(monthlyGdp * 0.40 * (taxes.pitRate / 100) * eff * legal);
        const projCit = Math.round(monthlyGdp * 0.16 * (taxes.citRate / 100) * eff);
        const projSocial = Math.round(monthlyGdp * 0.40 * (taxes.socialContributionRate / 100) * eff * 0.95);
        const projExcise = Math.round(monthlyGdp * 0.022 * (taxes.exciseRate / 15) * eff);
        const projOther = Math.round(monthlyGdp * 0.025);
        const projRevenues = projVat + projPit + projCit + projSocial + projExcise + projOther;

        const baselinePublicMonthly = monthlyGdp * 0.28;
        let projPrimarySpending = 0;
        for (const [k, v] of Object.entries(spending)) {
          if (k !== 'totalExpenditure' && k !== 'debtServicing') {
            projPrimarySpending += Math.round(baselinePublicMonthly * (v / 100));
          }
        }
        const debtCost = country.debt.monthlyInterestCost || 0;
        const projSpending = projPrimarySpending + debtCost;
        const projBalance = projRevenues - projSpending;

        const revEl = document.getElementById('live-proj-revenue');
        const spendEl = document.getElementById('live-proj-spending');
        const balEl = document.getElementById('live-proj-balance');
        if (revEl) revEl.innerHTML = F.money(projRevenues, 'USD');
        if (spendEl) spendEl.innerHTML = F.money(projSpending, 'USD');
        if (balEl) balEl.innerHTML = F.delta(projBalance, false, 'USD');
      };

      // Spending sliders
      container.querySelectorAll('.budget-slider').forEach(slider => {
        slider.oninput = (e) => {
          const cat = slider.getAttribute('data-cat');
          const val = parseFloat(e.target.value);
          this.pendingSpending[cat] = val;
          const displayEl = document.getElementById(`val-spending-${cat}`);
          if (displayEl) displayEl.textContent = `${val.toFixed(1)}%`;
          recalculateLiveProjections();
        };

        slider.onchange = (e) => {
          const cat = slider.getAttribute('data-cat');
          const val = parseFloat(e.target.value);
          window.WorldForge.Core.Commands.dispatch({
            type: 'SET_BUDGET',
            countryId,
            payload: { category: cat, value: val }
          });
        };
      });

      // Tax sliders
      container.querySelectorAll('.tax-slider').forEach(slider => {
        slider.oninput = (e) => {
          const taxType = slider.getAttribute('data-tax');
          const rate = parseFloat(e.target.value);
          this.pendingTaxes[taxType] = rate;
          const displayEl = document.getElementById(`val-tax-${taxType}`);
          if (displayEl) displayEl.textContent = `${rate.toFixed(1)}%`;
          recalculateLiveProjections();
        };

        slider.onchange = (e) => {
          const taxType = slider.getAttribute('data-tax');
          const rate = parseFloat(e.target.value);
          window.WorldForge.Core.Commands.dispatch({
            type: 'SET_TAX_RATE',
            countryId,
            payload: { taxType, rate }
          });
        };
      });

      // Auto-balance button
      container.querySelector('#btn-auto-balance-budget')?.addEventListener('click', () => {
        window.WorldForge.Core.Commands.dispatch({
          type: 'AUTO_BALANCE_BUDGET',
          countryId,
          payload: {}
        });
        this.pendingSpending = null;
        this.pendingTaxes = null;
        this.render(container);
        window.WorldForge.UI.Navigation.updateTopBar();
      });

      // Apply changes
      container.querySelector('#btn-apply-budget-plan')?.addEventListener('click', () => {
        for (const [cat, val] of Object.entries(this.pendingSpending)) {
          if (cat !== 'totalExpenditure' && cat !== 'debtServicing') {
            window.WorldForge.Core.Commands.dispatch({
              type: 'SET_BUDGET',
              countryId,
              payload: { category: cat, value: val }
            });
          }
        }
        for (const [taxType, rate] of Object.entries(this.pendingTaxes)) {
          window.WorldForge.Core.Commands.dispatch({
            type: 'SET_TAX_RATE',
            countryId,
            payload: { taxType, rate }
          });
        }
        this.render(container);
        window.WorldForge.UI.Navigation.updateTopBar();
      });

      // Revert changes
      container.querySelector('#btn-revert-budget-plan')?.addEventListener('click', () => {
        this.pendingSpending = null;
        this.pendingTaxes = null;
        this.render(container);
      });

      // Digitalization
      container.querySelector('#btn-invest-tax-digital')?.addEventListener('click', () => {
        window.WorldForge.Core.Commands.dispatch({
          type: 'INVEST_TAX_ADMIN',
          countryId,
          payload: { field: 'digitalization', amount: 100000000 }
        });
        this.render(container);
      });
    }
  };

  window.WorldForge.UI.Budget = BudgetUI;
})();
