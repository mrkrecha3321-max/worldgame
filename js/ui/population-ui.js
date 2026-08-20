/**
 * WorldForge: Nations - Demographics & Public Healthcare UI
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const PopulationUI = {
    render(container) {
      if (!container) return;

      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!country) return;

      const NF = window.WorldForge.Core.NumberFormat;
      const pop = country.population;

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Top Demographic Metrics -->
          <div class="grid-2">
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Populacja Całkowita</span>
              <span class="stat-value text-accent">${NF.formatPopulation(pop.total)}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Współczynnik Dzietności (TFR)</span>
              <span class="stat-value ${pop.birthRate < 1.6 ? 'text-negative' : 'text-positive'}">${pop.birthRate.toFixed(2)}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Migracja Miesięczna</span>
              <span class="stat-value text-positive">+${pop.netMigrationMonthly} / m-c</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Długość Życia</span>
              <span class="stat-value">${pop.lifeExpectancy.toFixed(1)} lat</span>
            </div>
          </div>

          <!-- Age Structure Distribution -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Struktura Wieku Społeczeństwa</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span>Młodzież (0-17 lat):</span>
                  <strong class="font-mono text-accent">${pop.youthShare.toFixed(1)}%</strong>
                </div>
                <div style="height: 4px; background: var(--bg-input); border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${pop.youthShare}%; background: var(--accent);"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span>Wiek Produkcyjny (18-64 lata):</span>
                  <strong class="font-mono text-positive">${pop.workingAgeShare.toFixed(1)}%</strong>
                </div>
                <div style="height: 4px; background: var(--bg-input); border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${pop.workingAgeShare}%; background: var(--positive);"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span>Emeryci (65+ lat):</span>
                  <strong class="font-mono text-warning">${pop.elderlyShare.toFixed(1)}%</strong>
                </div>
                <div style="height: 4px; background: var(--bg-input); border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${pop.elderlyShare}%; background: var(--warning);"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Healthcare & Education -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Jakość Usług Publicznych</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span>Ochrona Zdrowia:</span>
                  <strong class="font-mono text-accent">${pop.healthcareQualityIndex.toFixed(1)} / 100</strong>
                </div>
                <div style="height: 4px; background: var(--bg-input); border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${pop.healthcareQualityIndex}%; background: var(--accent);"></div>
                </div>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">Łóżka szpitalne: ${country.infrastructure.hospitalBedsPer1000.toFixed(1)} na 1000 mieszk.</div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span>Edukacja i Uczelnie:</span>
                  <strong class="font-mono text-positive">${pop.educationQualityIndex.toFixed(1)} / 100</strong>
                </div>
                <div style="height: 4px; background: var(--bg-input); border-radius: 2px; overflow: hidden;">
                  <div style="height: 100%; width: ${pop.educationQualityIndex}%; background: var(--positive);"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      `;
    }
  };

  window.WorldForge.UI.Population = PopulationUI;
})();
