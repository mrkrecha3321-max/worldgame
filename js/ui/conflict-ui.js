/**
 * WorldForge: Nations - Intelligence & Strategic Conflict Operations UI
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const ConflictUI = {
    selectedTargetId: 'RUS',

    render(container) {
      if (!container) return;

      const state = window.WorldForge.Core.GameState.getState();
      const playerCountry = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!state || !playerCountry) return;

      const F = window.WorldForge.Format;
      const allCountries = Object.values(state.countries).filter(c => c.id !== state.playerCountryId);
      const targetCountry = state.countries[this.selectedTargetId] || allCountries[0];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Conflict & Intel Header -->
          <div class="wf-card" style="border-left: 3px solid var(--negative);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 13px;">🕵️ Agencja Wywiadu i Bezpieczeństwo Strategiczne</strong>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Operacje szpiegowskie, sabotaż, uderzenia rakietowe i obrona cybernetyczna</div>
              </div>
              <span class="wf-badge wf-badge-red">Odstraszanie: ${playerCountry.military?.deterrenceScore || 50}/100</span>
            </div>
          </div>

          <!-- Target Country Selector -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Cel Operacyjny: ${targetCountry.namePl}</span>
              <select id="conflict-target-select" class="wf-select" style="font-size: 11px; padding: 2px 6px;">
                ${allCountries.map(c => `
                  <option value="${c.id}" ${c.id === targetCountry.id ? 'selected' : ''}>${c.flag} ${c.namePl} (${c.id})</option>
                `).join('')}
              </select>
            </div>

            <!-- Intelligence Missions Grid -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              
              <!-- Steal Tech -->
              <div style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 11px;">Kradzież Technologii B+R</strong>
                  <div style="font-size: 10px; color: var(--text-muted);">Infiltracja instytutów naukowych i wykradzenie planów badawczych (+600 pkt).</div>
                  <div style="font-size: 10px; color: var(--positive);">Koszt: $450 mln USD</div>
                </div>
                <button class="wf-btn wf-btn-sm wf-btn-primary btn-exec-intel" data-op="STEAL_TECH">
                  Wyślij Agentów
                </button>
              </div>

              <!-- Sabotage Factory -->
              <div style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 11px;">Sabotaż Zakładów Przemysłowych</strong>
                  <div style="font-size: 10px; color: var(--text-muted);">Dywersja w kluczowej fabryce rywala, unieruchamiająca produkcję na 3 miesiące.</div>
                  <div style="font-size: 10px; color: var(--positive);">Koszt: $450 mln USD</div>
                </div>
                <button class="wf-btn wf-btn-sm wf-btn-danger btn-exec-intel" data-op="SABOTAGE_FACTORY">
                  Wykonaj Sabotaż
                </button>
              </div>

              <!-- Cyberattack -->
              <div style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 11px;">Cyberatak na Sieć Energetyczną / Banki</strong>
                  <div style="font-size: 10px; color: var(--text-muted);">Paraliż serwerów podstacji i wywołanie ryzyka blackoutu u rywala.</div>
                  <div style="font-size: 10px; color: var(--positive);">Koszt: $450 mln USD</div>
                </div>
                <button class="wf-btn wf-btn-sm wf-btn-secondary btn-exec-intel" data-op="CYBER_ATTACK">
                  Uruchom Malware
                </button>
              </div>

              <!-- Destabilize Election -->
              <div style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <strong style="font-size: 11px;">Dezinformacja i Destabilizacja Rządu</strong>
                  <div style="font-size: 10px; color: var(--text-muted);">Finansowanie protestów społecznych i obniżenie poparcia rządu rywala (-10%).</div>
                  <div style="font-size: 10px; color: var(--positive);">Koszt: $450 mln USD</div>
                </div>
                <button class="wf-btn wf-btn-sm wf-btn-secondary btn-exec-intel" data-op="DESTABILIZE">
                  Destabilizuj
                </button>
              </div>

            </div>
          </div>

          <!-- Strategic Kinetic Missile Salvo -->
          <div class="wf-card" style="border-left: 3px solid var(--negative);">
            <div class="card-header">
              <span class="card-title">🚀 Strategiczne Uderzenie Rakietowe</span>
            </div>
            <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.35;">
              Wystrzelenie salwy rakiet manewrujących w infrastrukturę krytyczną ${targetCountry.namePl}. Obrona przeciwlotnicza celu podejmie próbę przechwycenia.
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
              <span style="font-size: 10px; color: var(--text-muted);">Koszt amunicji: <strong class="text-positive">$800 mln USD</strong></span>
              <button class="wf-btn wf-btn-sm wf-btn-danger" id="btn-fire-missile-salvo">
                Wystrzel Salwę Rakietową
              </button>
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container);
    },

    bindEvents(container) {
      const state = window.WorldForge.Core.GameState.getState();
      const playerCountry = window.WorldForge.Core.GameState.getPlayerCountry();

      // Change target
      const targetSelect = container.querySelector('#conflict-target-select');
      if (targetSelect) {
        targetSelect.onchange = (e) => {
          this.selectedTargetId = e.target.value;
          this.render(container);
        };
      }

      // Execute Intelligence operations
      container.querySelectorAll('.btn-exec-intel').forEach(btn => {
        btn.onclick = () => {
          const opType = btn.getAttribute('data-op');
          window.WorldForge.Systems.Conflict.executeIntelligenceOp(state, playerCountry.id, {
            targetCountryId: this.selectedTargetId,
            opType: opType
          });
          window.WorldForge.UI.Navigation.updateTopBar();
          this.render(container);
        };
      });

      // Missile salvo
      container.querySelector('#btn-fire-missile-salvo')?.addEventListener('click', () => {
        window.WorldForge.Systems.Conflict.executeStrategicStrike(state, playerCountry.id, {
          targetCountryId: this.selectedTargetId
        });
        window.WorldForge.UI.Navigation.updateTopBar();
        this.render(container);
      });
    }
  };

  window.WorldForge.UI.Conflict = ConflictUI;
})();
