/**
 * WorldForge: Nations - Infrastructure, Energy & Megaprojects UI
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const InfrastructureUI = {
    render(container) {
      if (!container) return;

      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      const NF = window.WorldForge.Core.NumberFormat;
      const infra = country.infrastructure;
      const energy = country.energy;
      const projectsCatalog = window.WorldForge.Data.Projects || [];
      const activeProjs = country.projects?.active || [];
      const completedProjs = country.projects?.completed || [];
      const Charts = window.WorldForge.UI.Charts;

      const mix = energy.mix || {};
      const mixSegments = [
        { label: 'Węgiel', value: mix.coal || 0, color: '#475569' },
        { label: 'Gaz', value: mix.gas || 0, color: '#ad864a' },
        { label: 'Atom', value: mix.nuclear || 0, color: '#73628a' },
        { label: 'Hydro', value: mix.hydro || 0, color: '#5e829c' },
        { label: 'Wiatr', value: mix.wind || 0, color: '#5b8764' },
        { label: 'Solar', value: mix.solar || 0, color: '#888f4e' },
        { label: 'Magazyny', value: mix.storage || 0, color: '#5a6b7c' }
      ];
      const energyDonut = Charts.createDonutChart(mixSegments, 90);

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Energy Grid & Power Balance -->
          <div class="wf-card" style="border-left: 3px solid var(--warning);">
            <div class="card-header">
              <span class="card-title">Krajowy System Elektroenergetyczny (KSE)</span>
              <span class="wf-badge ${energy.blackoutRisk > 10 ? 'wf-badge-red' : 'wf-badge-green'}">
                Ryzyko blackoutu: ${energy.blackoutRisk.toFixed(1)}%
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px;">
                <div>Moc Zainstalowana: <strong class="font-mono text-positive">${energy.totalCapacityGW.toFixed(1)} GW</strong></div>
                <div>Szczytowe Zapotrzebowanie: <strong class="font-mono text-warning">${energy.peakDemandGW.toFixed(1)} GW</strong></div>
                <div>Czysta Energia: <strong class="font-mono text-accent">${energy.cleanEnergyShare.toFixed(1)}%</strong></div>
                <div>Emisje CO2: <strong class="font-mono">${energy.carbonEmissionsMt.toFixed(1)} Mt</strong></div>
              </div>
              <div style="display: flex; justify-content: center; align-items: center;">
                ${energyDonut}
              </div>
            </div>
          </div>

          <!-- Infrastructure Network Ratings -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Wskaźniki Jakości Infrastruktury</span>
            </div>

            <div class="grid-2">
              <div class="stat-pill" style="background: var(--bg-panel); padding: 5px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
                <span class="stat-label">Drogi i Autostrady</span>
                <span class="stat-value text-accent">${infra.roadQuality.toFixed(0)} / 100</span>
              </div>
              <div class="stat-pill" style="background: var(--bg-panel); padding: 5px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
                <span class="stat-label">Kolej i KDP</span>
                <span class="stat-value text-positive">${infra.railQuality.toFixed(0)} (${infra.highSpeedRailKm} km KDP)</span>
              </div>
              <div class="stat-pill" style="background: var(--bg-panel); padding: 5px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
                <span class="stat-label">Porty Morskie</span>
                <span class="stat-value">${infra.seaportsCapacity.toFixed(0)} / 100</span>
              </div>
              <div class="stat-pill" style="background: var(--bg-panel); padding: 5px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
                <span class="stat-label">Zasięg 5G / Sieci</span>
                <span class="stat-value text-accent">${infra.digitalBroadband5GCoverage.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <!-- Megaprojects Pipeline -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Strategiczne Megaprojekty Państwowe</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto;">
              ${projectsCatalog.map(proj => {
                const isActive = activeProjs.some(p => p.id === proj.id);
                const isCompleted = completedProjs.some(p => p.id === proj.id);
                const activeData = activeProjs.find(p => p.id === proj.id);

                return `
                  <div style="background: var(--bg-panel); border: 1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}; border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong style="font-size: 11px; color: var(--text-primary);">${proj.name}</strong>
                      ${isCompleted ? '<span class="wf-badge wf-badge-green">Ukończony</span>' :
                        isActive ? `<span class="wf-badge wf-badge-cyan">${activeData.progressPercent.toFixed(0)}%</span>` :
                        '<span class="wf-badge wf-badge-amber">Dostępny</span>'}
                    </div>

                    <div style="font-size: 10px; color: var(--text-muted); display: flex; justify-content: space-between;">
                      <span>Koszt: ${NF.formatMoney(proj.totalCost)}</span>
                      <span>Czas: ${proj.durationMonths} m-cy</span>
                    </div>

                    ${isCompleted ? `
                      <button class="wf-btn wf-btn-sm wf-btn-secondary" style="width: 100%;" disabled>Wdrożony</button>
                    ` : isActive ? `
                      <div style="height: 3px; background: var(--bg-input); border-radius: 1px; overflow: hidden; margin: 2px 0;">
                        <div style="height: 100%; width: ${activeData.progressPercent}%; background: var(--accent);"></div>
                      </div>
                      <button class="wf-btn wf-btn-sm wf-btn-danger btn-cancel-project" data-proj-id="${proj.id}" style="width: 100%;">
                        Przerwij projekt
                      </button>
                    ` : `
                      <button class="wf-btn wf-btn-sm wf-btn-primary btn-start-project" data-proj-id="${proj.id}" style="width: 100%;">
                        Rozpocznij (Wkład: ${NF.formatMoney(proj.totalCost * 0.1)})
                      </button>
                    `}
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

      // Start project buttons
      container.querySelectorAll('.btn-start-project').forEach(btn => {
        btn.onclick = () => {
          const projId = btn.getAttribute('data-proj-id');
          const res = window.WorldForge.Core.Commands.dispatch({
            type: 'START_PROJECT',
            countryId,
            payload: { projectId: projId }
          });
          if (!res.success) {
            window.WorldForge.UI.Modal.showError('Projekt Niedostępny', res.reason);
          }
          this.render(container);
        };
      });

      // Cancel project buttons
      container.querySelectorAll('.btn-cancel-project').forEach(btn => {
        btn.onclick = () => {
          const projId = btn.getAttribute('data-proj-id');
          window.WorldForge.Core.Commands.dispatch({
            type: 'CANCEL_PROJECT',
            countryId,
            payload: { projectId: projId }
          });
          this.render(container);
        };
      });
    }
  };

  window.WorldForge.UI.Infrastructure = InfrastructureUI;
})();
