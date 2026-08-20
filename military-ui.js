/**
 * WorldForge: Nations - Military & Peace-Time Deterrence UI
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const MilitaryUI = {
    render(container) {
      if (!container) return;

      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      const NF = window.WorldForge.Core.NumberFormat;
      const mil = country.military;

      const branches = [
        { key: 'landForces', name: 'Wojska Lądowe i Pancerne', desc: 'Dywizje zmechanizowane, czołgi, artyleria' },
        { key: 'airForce', name: 'Siły Powietrzne i Lotnictwo', desc: 'Myśliwce wielozadaniowe, drony, transport' },
        { key: 'navy', name: 'Marynarka Wojenna i Flota', desc: 'Fregaty rakietowe, okręty podwodne' },
        { key: 'airDefense', name: 'Obrona Przeciwlotnicza', desc: 'Baterie rakiet Patriot/CAMM, radary' },
        { key: 'cyberDefense', name: 'Obrona Cyberprzestrzeni', desc: 'Kryptografia kwantowa i walka WRE' },
        { key: 'logistics', name: 'Logistyka Wojskowa', desc: 'Magazyny amunicyjne i zaopatrzenie' }
      ];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Key Deterrence Metrics -->
          <div class="grid-2">
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Wskaźnik Odstraszania</span>
              <span class="stat-value text-positive">${mil.deterrenceScore} / 100</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Gotowość Bojowa</span>
              <span class="stat-value text-accent">${mil.readiness.toFixed(0)}%</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Stan Osobowy Armii</span>
              <span class="stat-value">${NF.formatPopulation(mil.totalPersonnel)}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Modernizacja Sprzętu</span>
              <span class="stat-value text-accent">${mil.modernizationLevel.toFixed(0)}%</span>
            </div>
          </div>

          <!-- Branches Allocation -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Struktura Sił Zbrojnych i Alokacja Budżetu</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${branches.map(b => {
                const branchData = mil.branches[b.key] || { personnel: 10000, equipmentQuality: 70, share: 15 };
                return `
                  <div style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong style="font-size: 12px; color: var(--text-primary);">${b.name}</strong>
                      <span class="wf-badge wf-badge-cyan">${branchData.share}% budżetu</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-secondary);">
                      <span>Personel: <strong class="text-accent font-mono">${NF.formatInt(branchData.personnel)}</strong></span>
                      <span>Jakość sprzętu: <strong class="text-positive font-mono">${branchData.equipmentQuality}%</strong></span>
                    </div>

                    <div class="slider-group" style="margin-top: 2px;">
                      <div class="slider-header" style="font-size: 10px;">
                        <span>Alokacja budżetu obrony:</span>
                        <span class="font-mono text-accent" id="val-mil-${b.key}">${branchData.share}%</span>
                      </div>
                      <input type="range" class="wf-slider mil-branch-slider" data-branch="${b.key}" min="5" max="60" step="5" value="${branchData.share}" />
                    </div>
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

      container.querySelectorAll('.mil-branch-slider').forEach(slider => {
        slider.oninput = (e) => {
          const branch = slider.getAttribute('data-branch');
          const share = parseFloat(e.target.value);
          const displayEl = document.getElementById(`val-mil-${branch}`);
          if (displayEl) displayEl.textContent = `${share}%`;

          window.WorldForge.Core.Commands.dispatch({
            type: 'SET_MILITARY_CONFIG',
            countryId,
            payload: { branch, budgetShare: share }
          });
        };
      });
    }
  };

  window.WorldForge.UI.Military = MilitaryUI;
})();
