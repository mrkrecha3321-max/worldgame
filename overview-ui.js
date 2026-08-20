/**
 * WorldForge: Nations - Executive Overview UI
 * Compact analytical briefing with radar capabilities, key KPIs and active project tracking.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const OverviewUI = {
    render(container) {
      if (!container) return;

      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      const state = window.WorldForge.Core.GameState.getState();
      if (!country || !state) return;

      const NF = window.WorldForge.Core.NumberFormat;
      const Charts = window.WorldForge.UI.Charts;

      // Prepare Radar Metrics
      const radarData = [
        { axis: 'Gospodarka', value: Math.min(100, Math.round(country.economy.gdpPerCapita / 800)) },
        { axis: 'Finanse', value: Math.max(10, Math.round(100 - country.debt.debtToGdp * 0.6)) },
        { axis: 'Banki', value: Math.min(100, Math.round(country.commercialBanks[0]?.carSolvencyRatio * 6 || 60)) },
        { axis: 'Nauka', value: Math.min(100, (country.research.unlockedTechs.length * 6) + 20) },
        { axis: 'Energia', value: Math.min(100, Math.round(country.energy.cleanEnergyShare + 40)) },
        { axis: 'Obrona', value: country.military?.deterrenceScore || 50 },
        { axis: 'Infra', value: country.infrastructure.roadQuality || 70 }
      ];

      const gdpSpark = Charts.createSparkline(country.economy.gdpHistory, 120, 26, '#5b8764');
      const debtSpark = Charts.createSparkline(country.debt.historicalDebtToGdp, 120, 26, '#9e5554');

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Executive Brief Card -->
          <div class="wf-card" style="border-left: 3px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">${country.flag}</span>
                <div>
                  <h3 style="font-size: 14px;">${country.namePl} (${country.id})</h3>
                  <div style="font-size: 11px; color: var(--text-muted);">
                    ${country.governmentType} • ${country.currency}
                  </div>
                </div>
              </div>
              <span class="wf-badge wf-badge-cyan">Twoje Państwo</span>
            </div>
          </div>

          <!-- 2x2 Metric Cards Grid -->
          <div class="grid-2">
            
            <!-- PKB Card -->
            <div class="wf-card">
              <div class="card-header">
                <span class="card-title">PKB Nominalne</span>
                <span class="wf-badge wf-badge-green">${country.economy.gdpGrowthYoY > 0 ? '+' : ''}${country.economy.gdpGrowthYoY.toFixed(1)}%</span>
              </div>
              <div style="font-size: 18px; font-weight: 700; font-family: var(--font-mono); color: var(--positive);">
                ${NF.formatMoney(country.economy.gdpNominal)}
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2px;">
                <span style="font-size: 10px; color: var(--text-muted);">${NF.formatMoney(country.economy.gdpPerCapita)} / os.</span>
                ${gdpSpark}
              </div>
            </div>

            <!-- Budżet & Skarb Card -->
            <div class="wf-card">
              <div class="card-header">
                <span class="card-title">Skarb Państwa</span>
                <span class="wf-badge ${country.budget.balanceMonthly >= 0 ? 'wf-badge-green' : 'wf-badge-red'}">
                  ${NF.formatDelta(country.budget.balanceMonthly)}
                </span>
              </div>
              <div style="font-size: 18px; font-weight: 700; font-family: var(--font-mono); color: var(--accent);">
                ${NF.formatMoney(country.treasury)}
              </div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                Saldo pierwotne: <strong class="${country.budget.primaryBalance >= 0 ? 'text-positive' : 'text-negative'}">${NF.formatMoney(country.budget.primaryBalance)}</strong>
              </div>
            </div>

            <!-- Inflacja Card -->
            <div class="wf-card">
              <div class="card-header">
                <span class="card-title">Inflacja (CPI)</span>
                <span class="wf-badge wf-badge-amber">Cel: ${country.centralBank.inflationTarget}%</span>
              </div>
              <div style="font-size: 18px; font-weight: 700; font-family: var(--font-mono); color: var(--warning);">
                ${country.economy.inflation.toFixed(1)}%
              </div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                Stopa banku centralnego: ${country.centralBank.baseRate.toFixed(2)}%
              </div>
            </div>

            <!-- Dług Publiczny Card -->
            <div class="wf-card">
              <div class="card-header">
                <span class="card-title">Dług / PKB</span>
                <span class="wf-badge ${country.debt.debtToGdp > 80 ? 'wf-badge-red' : 'wf-badge-cyan'}">${country.debt.creditRating}</span>
              </div>
              <div style="font-size: 18px; font-weight: 700; font-family: var(--font-mono); color: ${country.debt.debtToGdp > 80 ? 'var(--negative)' : 'var(--text-primary)'};">
                ${country.debt.debtToGdp.toFixed(1)}%
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2px;">
                <span style="font-size: 10px; color: var(--text-muted);">${NF.formatMoney(country.debt.totalDebt)}</span>
                ${debtSpark}
              </div>
            </div>

          </div>

          <!-- Radar National Capabilities -->
          <div class="wf-card" style="align-items: center; text-align: center; padding: 10px;">
            <div class="card-header" style="width: 100%;">
              <span class="card-title">Profil Zdolności Strategicznych</span>
              <span style="font-size: 10px; color: var(--text-muted);">Indeks 0-100</span>
            </div>
            <div style="padding: 6px 0;">
              ${Charts.createRadarChart(radarData, 170)}
            </div>
          </div>

          <!-- Active Megaprojects & Science -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Projekty i Badania w Toku</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <!-- Megaprojects -->
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
                  <strong style="color: var(--text-secondary);">Aktywne Inwestycje:</strong>
                  <span class="text-accent font-mono">${country.projects?.active.length || 0}</span>
                </div>
                ${(country.projects?.active && country.projects.active.length > 0) ? country.projects.active.map(p => `
                  <div style="background: var(--bg-panel); padding: 6px 8px; border-radius: var(--border-radius-xs); margin-bottom: 4px; border: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 500;">
                      <span>${p.name}</span>
                      <span class="text-positive font-mono">${p.progressPercent.toFixed(0)}%</span>
                    </div>
                    <div style="height: 3px; background: var(--bg-input); border-radius: 1px; margin-top: 3px; overflow: hidden;">
                      <div style="height: 100%; width: ${p.progressPercent}%; background: var(--accent);"></div>
                    </div>
                  </div>
                `).join('') : '<div style="color: var(--text-muted); font-size: 11px;">Brak aktywnych megaprojektów.</div>'}
              </div>

              <!-- Research Node -->
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
                  <strong style="color: var(--text-secondary);">Badania B+R:</strong>
                  <span class="text-accent font-mono">+${country.research.monthlyPoints} pkt/m-c</span>
                </div>
                ${country.research.activeTechId ? `
                  <div style="background: var(--bg-panel); padding: 6px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
                    <div style="font-size: 11px; font-weight: 600; color: var(--accent);">
                      ${window.WorldForge.Data.Technologies.find(t => t.id === country.research.activeTechId)?.name}
                    </div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;" class="font-mono">
                      Postęp: ${country.research.activeTechProgress} / ${window.WorldForge.Data.Technologies.find(t => t.id === country.research.activeTechId)?.costPoints} pkt
                    </div>
                  </div>
                ` : '<div style="color: var(--text-muted); font-size: 11px;">Brak wyznaczonego celu badawczego.</div>'}
              </div>
            </div>

          </div>

        </div>
      `;
    }
  };

  window.WorldForge.UI.Overview = OverviewUI;
})();
