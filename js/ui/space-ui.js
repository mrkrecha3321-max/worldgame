/**
 * WorldForge: Nations - National Space Race Program UI
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const SpaceUI = {
    render(container) {
      if (!container) return;

      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      const F = window.WorldForge.Format;
      const missions = window.WorldForge.Systems.Space.MISSIONS || [];
      const spaceProg = country.spaceProgram || { tier: 0, activeMissions: [], completedMissions: [], moonLanded: false };

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Space Header Status -->
          <div class="wf-card" style="border-left: 3px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 13px;">🚀 Narodowa Agencja Kosmiczna (Space Program)</strong>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                  Poziom programu: <strong class="text-accent font-mono">Tier ${spaceProg.tier} / 4</strong> • 
                  ${spaceProg.moonLanded ? '<span class="wf-badge wf-badge-green">Lądowanie na Księżycu: Sukces!</span>' : '<span class="wf-badge wf-badge-amber">Wyścig na Księżyc w toku</span>'}
                </div>
              </div>
            </div>
          </div>

          <!-- Missions List -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Etapy i Misje Programu Kosmicznego</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 420px; overflow-y: auto;">
              ${missions.map(m => {
                const isCompleted = spaceProg.completedMissions?.includes(m.id);
                const activeData = spaceProg.activeMissions?.find(am => am.id === m.id);
                const isLocked = m.reqTier && spaceProg.tier < m.reqTier;

                const statusBadge = isCompleted ? '<span class="wf-badge wf-badge-green">Misja Ukończona</span>' :
                                    activeData ? `<span class="wf-badge wf-badge-cyan">Lot w toku (${activeData.progressPercent}%)</span>` :
                                    isLocked ? '<span class="wf-badge wf-badge-red">Wymaga wcześniejszego Tier</span>' :
                                    '<span class="wf-badge wf-badge-amber">Gotowa do startu</span>';

                return `
                  <div style="background: var(--bg-panel); border: 1px solid ${activeData ? 'var(--accent)' : (isCompleted ? 'var(--positive-border)' : 'var(--border)')}; border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong style="font-size: 12px; color: var(--text-primary);">${m.name}</strong>
                      ${statusBadge}
                    </div>
                    <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.35;">${m.desc}</p>
                    <div style="font-size: 10px; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 2px;">
                      <span>Koszt misji: <strong class="text-positive">${F.money(m.cost, 'USD')}</strong></span>
                      <span>Czas realizacji: <strong>${m.durationMonths} m-cy</strong></span>
                    </div>

                    <div style="margin-top: 4px;">
                      ${isCompleted ? `
                        <button class="wf-btn wf-btn-sm wf-btn-secondary" style="width: 100%;" disabled>Misja Zrealizowana</button>
                      ` : activeData ? `
                        <div style="height: 3px; background: var(--bg-input); border-radius: 1px; overflow: hidden; margin-bottom: 4px;">
                          <div style="height: 100%; width: ${activeData.progressPercent}%; background: var(--accent);"></div>
                        </div>
                        <button class="wf-btn wf-btn-sm wf-btn-secondary" style="width: 100%;" disabled>W trakcie lotu (pozostało ${activeData.remainingMonths} m-cy)</button>
                      ` : !isLocked ? `
                        <button class="wf-btn wf-btn-sm wf-btn-primary btn-launch-space-mission" data-mission-id="${m.id}" style="width: 100%;">
                          Zainicjuj Misję Kosmiczną
                        </button>
                      ` : `
                        <button class="wf-btn wf-btn-sm wf-btn-secondary" style="width: 100%; opacity: 0.5;" disabled>Zablokowane (Wymagany Tier ${m.reqTier})</button>
                      `}
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
      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      container.querySelectorAll('.btn-launch-space-mission').forEach(btn => {
        btn.onclick = () => {
          const missionId = btn.getAttribute('data-mission-id');
          const res = window.WorldForge.Systems.Space.launchMission(country, missionId, window.WorldForge.Core.GameState.state.time.currentTurn);
          if (!res.success) {
            window.WorldForge.UI.Modal.showError('Start Misji Niemożliwy', res.reason);
          }
          window.WorldForge.UI.Navigation.updateTopBar();
          this.render(container);
        };
      });
    }
  };

  window.WorldForge.UI.Space = SpaceUI;
})();
