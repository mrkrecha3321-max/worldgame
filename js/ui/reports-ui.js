/**
 * WorldForge: Nations - Turn End Reports UI
 * Uses strict Polish scale (tys., mln, mld, bln).
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const ReportsUI = {
    selectedReportTurn: null,

    render(container) {
      if (!container) return;

      const state = window.WorldForge.Core.GameState.getState();
      if (!state) return;

      const F = window.WorldForge.Format;
      const reports = state.turnReports || [];

      if (reports.length === 0) {
        container.innerHTML = `
          <div class="wf-card" style="text-align: center; padding: 20px;">
            <strong style="font-size: 13px;">Archiwum Raportów Miesięcznych</strong>
            <p style="color: var(--text-muted); font-size: 11px; margin-top: 4px;">
              Pierwszy raport zostanie wygenerowany automatycznie po upływie bieżącego miesiąca.
            </p>
          </div>
        `;
        return;
      }

      const activeTurn = this.selectedReportTurn || reports[reports.length - 1].turn;
      const report = reports.find(r => r.turn === activeTurn) || reports[reports.length - 1];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Header & Turn Switcher -->
          <div class="wf-card" style="border-left: 3px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 13px;">Raport: ${report.date}</strong>
                <div style="font-size: 10px; color: var(--text-muted);">Miesiąc ${report.turn}</div>
              </div>

              <select id="report-turn-selector" class="wf-select" style="font-size: 11px;">
                ${reports.map(r => `
                  <option value="${r.turn}" ${r.turn === report.turn ? 'selected' : ''}>
                    Miesiąc ${r.turn} (${r.date})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Key Financial Diff Metrics -->
          <div class="grid-2">
            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">PKB Po Zmianie</span>
              <span class="stat-value text-positive">${F.money(report.gdpAfter, 'USD')}</span>
              <span style="font-size: 10px;">Zmiana: ${F.delta(report.gdpDiff, false, 'USD')}</span>
            </div>

            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Saldo Miesiąca</span>
              <span class="stat-value">${F.delta(report.balance, false, 'USD')}</span>
              <span style="font-size: 10px; color: var(--text-muted);">Skarb: ${F.money(report.treasury, 'USD')}</span>
            </div>

            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Inflacja (CPI)</span>
              <span class="stat-value text-warning">${report.inflation.toFixed(1)}%</span>
              <span style="font-size: 10px;">Δ: ${report.inflationDiff > 0 ? '+' : ''}${report.inflationDiff.toFixed(2)} pp.</span>
            </div>

            <div class="stat-pill" style="background: var(--bg-panel); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Dług Publiczny</span>
              <span class="stat-value">${report.debtToGdp.toFixed(1)}%</span>
              <span style="font-size: 10px; color: var(--text-muted);">Odsetki: ${F.money(report.debtServicing, 'USD')}</span>
            </div>
          </div>

          <!-- Causal Explanations Box -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Analiza Przyczynowo-Skutkowa</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${(report.explanations || []).map(exp => `
                <div style="background: var(--bg-panel); padding: 6px 8px; border-left: 2px solid var(--accent); border-radius: 2px; font-size: 11px; color: var(--text-primary);">
                  ${exp}
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container);
    },

    bindEvents(container) {
      const select = container.querySelector('#report-turn-selector');
      if (select) {
        select.onchange = (e) => {
          this.selectedReportTurn = parseInt(e.target.value, 10);
          this.render(container);
        };
      }
    },

    showTurnReportModal(report) {
      const F = window.WorldForge.Format;
      const contentHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="grid-2">
            <div style="background: var(--bg-panel-secondary); padding: 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <div style="font-size: 10px; color: var(--text-muted);">PKB:</div>
              <strong class="font-mono text-positive" style="font-size: 15px;">${F.money(report.gdpAfter, 'USD')}</strong>
              <div style="font-size: 10px;">Zmiana: ${F.delta(report.gdpDiff, false, 'USD')}</div>
            </div>
            <div style="background: var(--bg-panel-secondary); padding: 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <div style="font-size: 10px; color: var(--text-muted);">Saldo Miesięczne:</div>
              <strong class="font-mono" style="font-size: 15px;">${F.delta(report.balance, false, 'USD')}</strong>
              <div style="font-size: 10px; color: var(--text-muted);">Skarb: ${F.money(report.treasury, 'USD')}</div>
            </div>
          </div>

          <div style="background: var(--bg-panel-secondary); padding: 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
            <div style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px;">Kluczowe zjawiska miesiąca:</div>
            <ul style="padding-left: 16px; font-size: 11px; color: var(--text-secondary); line-height: 1.45;">
              ${(report.explanations || []).map(e => `<li>${e}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;

      window.WorldForge.UI.Modal.show({
        title: `Podsumowanie Miesiąca: ${report.date} (Tura ${report.turn})`,
        contentHtml: contentHtml,
        buttons: [{ text: 'Przejdź do Mapy', class: 'wf-btn-primary', autoClose: true }]
      });
    }
  };

  window.WorldForge.UI.Reports = ReportsUI;
})();
