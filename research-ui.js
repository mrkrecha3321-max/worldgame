/**
 * WorldForge: Nations - Research & Technology Tree UI
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const ResearchUI = {
    activeBranchFilter: 'all',

    render(container) {
      if (!container) return;

      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      const techList = window.WorldForge.Data.Technologies || [];
      const res = country.research || { monthlyPoints: 100, unlockedTechs: [], activeTechId: null, activeTechProgress: 0 };

      const branches = [
        { id: 'all', name: 'Wszystkie' },
        { id: 'economics', name: 'Makroekonomia' },
        { id: 'banking', name: 'Bankowość' },
        { id: 'energy', name: 'Energetyka' },
        { id: 'transport', name: 'Transport' },
        { id: 'industry', name: 'Przemysł 4.0' },
        { id: 'digital', name: 'Cyfryzacja i AI' },
        { id: 'biotech', name: 'Biotechnologia' },
        { id: 'defense', name: 'Obronność' }
      ];

      const filteredTechs = techList.filter(t => this.activeBranchFilter === 'all' || t.branch === this.activeBranchFilter);

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Research Header Status -->
          <div class="wf-card" style="border-left: 3px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 13px;">Badania Naukowe i Rozwój (B+R)</strong>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  Punkty B+R: <strong class="text-accent font-mono">+${res.monthlyPoints}/m-c</strong> • Odblokowano: <strong class="font-mono text-positive">${res.unlockedTechs.length}/${techList.length}</strong>
                </div>
              </div>

              ${res.activeTechId ? `
                <div style="font-size: 11px; text-align: right;">
                  <span class="text-accent" style="font-weight: 600;">${techList.find(t => t.id === res.activeTechId)?.name}</span>
                  <div class="font-mono" style="font-size: 10px; color: var(--text-muted);">${res.activeTechProgress} / ${techList.find(t => t.id === res.activeTechId)?.costPoints} pkt</div>
                </div>
              ` : '<span class="wf-badge wf-badge-amber">Brak celu</span>'}
            </div>
          </div>

          <!-- Branch Filters -->
          <div style="display: flex; gap: 3px; flex-wrap: wrap;" id="research-branch-filters">
            ${branches.map(b => `
              <button class="map-mode-btn ${this.activeBranchFilter === b.id ? 'active' : ''}" data-branch="${b.id}">
                ${b.name}
              </button>
            `).join('')}
          </div>

          <!-- Technologies Grid -->
          <div style="display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow-y: auto;">
            ${filteredTechs.map(tech => {
              const isUnlocked = res.unlockedTechs.includes(tech.id);
              const isActive = res.activeTechId === tech.id;
              
              let prereqsSatisfied = true;
              if (tech.prerequisites && tech.prerequisites.length > 0) {
                for (const pid of tech.prerequisites) {
                  if (!res.unlockedTechs.includes(pid)) {
                    prereqsSatisfied = false;
                    break;
                  }
                }
              }

              const statusBadge = isUnlocked ? '<span class="wf-badge wf-badge-green">Wdrożono</span>' :
                                  isActive ? '<span class="wf-badge wf-badge-cyan">Badania w toku</span>' :
                                  !prereqsSatisfied ? '<span class="wf-badge wf-badge-red">Zablokowana</span>' :
                                  '<span class="wf-badge wf-badge-amber">Dostępna</span>';

              return `
                <div style="background: var(--bg-panel); border: 1px solid ${isActive ? 'var(--accent)' : (isUnlocked ? 'var(--positive-border)' : 'var(--border)')}; border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 12px; color: var(--text-primary);">${tech.name}</strong>
                    ${statusBadge}
                  </div>
                  <div style="font-size: 10px; color: var(--text-muted);">${tech.branchName} • Koszt: ${tech.costPoints} pkt (~${tech.estimatedMonths} m-cy)</div>
                  <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.3;">${tech.description}</p>
                  
                  <div style="margin-top: 4px;">
                    ${isUnlocked ? `
                      <button class="wf-btn wf-btn-sm wf-btn-secondary" style="width: 100%;" disabled>Wdrożono</button>
                    ` : isActive ? `
                      <button class="wf-btn wf-btn-sm wf-btn-secondary" style="width: 100%; color: var(--accent);" disabled>Badanie w toku...</button>
                    ` : prereqsSatisfied ? `
                      <button class="wf-btn wf-btn-sm wf-btn-primary btn-start-research" data-tech-id="${tech.id}" style="width: 100%;">
                        Rozpocznij Badania
                      </button>
                    ` : `
                      <button class="wf-btn wf-btn-sm wf-btn-secondary" style="width: 100%; opacity: 0.5;" disabled>Wymaga technologii nadrzędnych</button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>
      `;

      this.bindEvents(container);
    },

    bindEvents(container) {
      const countryId = window.WorldForge.Core.GameState.state.playerCountryId;

      // Branch filters
      container.querySelectorAll('#research-branch-filters button').forEach(btn => {
        btn.onclick = () => {
          this.activeBranchFilter = btn.getAttribute('data-branch');
          this.render(container);
        };
      });

      // Start research
      container.querySelectorAll('.btn-start-research').forEach(btn => {
        btn.onclick = () => {
          const techId = btn.getAttribute('data-tech-id');
          const res = window.WorldForge.Core.Commands.dispatch({
            type: 'START_RESEARCH',
            countryId,
            payload: { techId }
          });
          if (!res.success) {
            alert('Nie można rozpocząć badań: ' + res.reason);
          }
          this.render(container);
        };
      });
    }
  };

  window.WorldForge.UI.Research = ResearchUI;
})();
