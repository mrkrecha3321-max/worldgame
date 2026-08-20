/**
 * WorldForge: Nations - Diplomacy, Treaties, Direct Transfers & Sovereign Loans UI
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const DiplomacyUI = {
    selectedRegion: 'all',
    comparisonTargetId: 'DEU',

    render(container) {
      if (!container) return;

      const state = window.WorldForge.Core.GameState.getState();
      const playerCountry = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!state || !playerCountry) return;

      const F = window.WorldForge.Format;
      const allCountries = Object.values(state.countries).filter(c => c.id !== state.playerCountryId);
      const filtered = allCountries.filter(c => this.selectedRegion === 'all' || c.region === this.selectedRegion);
      const targetCountry = state.countries[this.comparisonTargetId] || allCountries[0];
      const loans = state.sovereignLoans || [];

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Top Diplomacy Header & Filters -->
          <div class="wf-card" style="border-left: 3px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <div>
                <strong style="font-size: 13px;">Dyplomacja, Transfery i Sojusze</strong>
                <div style="font-size: 10px; color: var(--text-muted);">Negocjacje, pożyczki międzynarodowe, przelewy i sankcje</div>
              </div>

              <!-- Region Filter -->
              <div style="display: flex; gap: 3px; flex-wrap: wrap;" id="diplo-region-filters">
                ${['all', 'Europa', 'Ameryka Północna', 'Azja', 'Bliski Wschód', 'Ameryka Południowa', 'Afryka', 'Oceania'].map(r => `
                  <button class="map-mode-btn ${this.selectedRegion === r ? 'active' : ''}" data-region="${r}">
                    ${r === 'all' ? 'Wszystkie' : r}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Country Comparison & Direct Capital Transfer Card -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Wybrane Państwo: ${targetCountry.namePl}</span>
              <select id="diplo-compare-select" class="wf-select" style="font-size: 11px; padding: 2px 6px;">
                ${allCountries.map(c => `
                  <option value="${c.id}" ${c.id === targetCountry.id ? 'selected' : ''}>${c.flag} ${c.namePl} (${c.id})</option>
                `).join('')}
              </select>
            </div>

            <!-- Action buttons for target country -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 6px;">
              <button class="wf-btn wf-btn-sm wf-btn-primary" id="btn-open-wire-transfer-modal">
                💸 Przelej Środki (Gotówka)
              </button>
              <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-open-sovereign-loan-modal">
                📜 Udziel Pożyczki Rządowej
              </button>
            </div>

            <!-- Comparison Table -->
            <div class="wf-table-container">
              <table class="wf-table">
                <thead>
                  <tr>
                    <th>Wskaźnik</th>
                    <th>${playerCountry.flag} ${playerCountry.namePl}</th>
                    <th>${targetCountry.flag} ${targetCountry.namePl}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>PKB Nominalne</td>
                    <td class="font-mono text-positive">${F.money(playerCountry.economy.gdpNominal, 'USD')}</td>
                    <td class="font-mono text-positive">${F.money(targetCountry.economy.gdpNominal, 'USD')}</td>
                  </tr>
                  <tr>
                    <td>PKB per Capita</td>
                    <td class="font-mono">${F.money(playerCountry.economy.gdpPerCapita, 'USD')}</td>
                    <td class="font-mono">${F.money(targetCountry.economy.gdpPerCapita, 'USD')}</td>
                  </tr>
                  <tr>
                    <td>Populacja</td>
                    <td class="font-mono text-accent">${F.population(playerCountry.population.total)}</td>
                    <td class="font-mono text-accent">${F.population(targetCountry.population.total)}</td>
                  </tr>
                  <tr>
                    <td>Dług / PKB</td>
                    <td class="font-mono ${playerCountry.debt.debtToGdp > 80 ? 'text-negative' : 'text-primary'}">${playerCountry.debt.debtToGdp.toFixed(1)}%</td>
                    <td class="font-mono ${targetCountry.debt.debtToGdp > 80 ? 'text-negative' : 'text-primary'}">${targetCountry.debt.debtToGdp.toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td>Odstraszanie</td>
                    <td class="font-mono text-accent">${playerCountry.military?.deterrenceScore || 50}/100</td>
                    <td class="font-mono text-accent">${targetCountry.military?.deterrenceScore || 50}/100</td>
                  </tr>
                  <tr>
                    <td>Relacje z Nami</td>
                    <td class="font-mono text-positive">100 (Własne)</td>
                    <td class="font-mono ${playerCountry.diplomacy?.relations[targetCountry.id] >= 0 ? 'text-positive' : 'text-negative'}">
                      ${playerCountry.diplomacy?.relations[targetCountry.id] > 0 ? '+' : ''}${playerCountry.diplomacy?.relations[targetCountry.id] || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Active Sovereign Loans Portfolio -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Aktywne Pożyczki Międzynarodowe (${loans.length})</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
              ${loans.length > 0 ? loans.map(l => {
                const lender = state.countries[l.lenderId];
                const borrower = state.countries[l.borrowerId];
                const isLender = l.lenderId === state.playerCountryId;
                return `
                  <div style="background: var(--bg-panel); padding: 6px 8px; border-radius: var(--border-radius-xs); border: 1px solid var(--border); display: flex; justify-content: space-between;">
                    <div>
                      <strong>${lender?.namePl} -> ${borrower?.namePl}: ${F.money(l.principal, 'USD')}</strong>
                      <div style="font-size: 10px; color: var(--text-muted);">Rata: ${F.money(l.monthlyInstallment, 'USD')}/m-c • Pozostało: ${l.remainingMonths} m-cy</div>
                    </div>
                    <span class="wf-badge ${isLender ? 'wf-badge-green' : 'wf-badge-amber'}">${isLender ? 'Pożyczkodawca' : 'Pożyczkobiorca'}</span>
                  </div>
                `;
              }).join('') : '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 6px;">Brak aktywnych pożyczek międzypaństwowych.</div>'}
            </div>
          </div>

          <!-- Diplomatic Relations Table -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Kraje Świata (${filtered.length})</span>
            </div>

            <div class="wf-table-container" style="max-height: 240px;">
              <table class="wf-table">
                <thead>
                  <tr>
                    <th>Państwo</th>
                    <th>Stosunki</th>
                    <th>Status</th>
                    <th>Działania</th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered.map(c => {
                    const rel = playerCountry.diplomacy?.relations[c.id] || 0;
                    const isSanctioned = playerCountry.diplomacy?.sanctionsAgainst?.includes(c.id);
                    const relBadge = rel > 50 ? 'wf-badge-green' : (rel > 15 ? 'wf-badge-cyan' : (rel > -20 ? 'wf-badge-amber' : 'wf-badge-red'));

                    return `
                      <tr>
                        <td>
                          <strong>${c.flag} ${c.namePl}</strong>
                          <div style="font-size: 9px; color: var(--text-muted);">${c.id}</div>
                        </td>
                        <td>
                          <span class="wf-badge ${relBadge}" style="font-family: var(--font-mono); font-weight: 600;">
                            ${rel > 0 ? '+' : ''}${rel.toFixed(0)}
                          </span>
                        </td>
                        <td>
                          ${isSanctioned ? '<span class="wf-badge wf-badge-red">Sankcje</span>' : '<span class="wf-badge wf-badge-cyan">Normalny</span>'}
                        </td>
                        <td>
                          <div style="display: flex; gap: 2px;">
                            <button class="wf-btn wf-btn-sm wf-btn-primary btn-diplo-improve" data-target="${c.id}">
                              Misja
                            </button>
                            ${isSanctioned ? `
                              <button class="wf-btn wf-btn-sm wf-btn-secondary btn-diplo-liftsanctions" data-target="${c.id}">
                                Znieś
                              </button>
                            ` : `
                              <button class="wf-btn wf-btn-sm wf-btn-danger btn-diplo-sanction" data-target="${c.id}">
                                Sankcje
                              </button>
                            `}
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      `;

      this.bindEvents(container);
    },

    bindEvents(container) {
      const countryId = window.WorldForge.Core.GameState.state.playerCountryId;

      // Compare selector
      const compareSelect = container.querySelector('#diplo-compare-select');
      if (compareSelect) {
        compareSelect.onchange = (e) => {
          this.comparisonTargetId = e.target.value;
          this.render(container);
        };
      }

      // Region filters
      container.querySelectorAll('#diplo-region-filters button').forEach(btn => {
        btn.onclick = () => {
          this.selectedRegion = btn.getAttribute('data-region');
          this.render(container);
        };
      });

      // Wire Transfer Modal
      container.querySelector('#btn-open-wire-transfer-modal')?.addEventListener('click', () => {
        this.showWireTransferModal(this.comparisonTargetId);
      });

      // Sovereign Loan Modal
      container.querySelector('#btn-open-sovereign-loan-modal')?.addEventListener('click', () => {
        this.showSovereignLoanModal(this.comparisonTargetId);
      });

      // Improve Relations
      container.querySelectorAll('.btn-diplo-improve').forEach(btn => {
        btn.onclick = () => {
          const targetId = btn.getAttribute('data-target');
          window.WorldForge.Core.Commands.dispatch({
            type: 'DIPLOMATIC_ACTION',
            countryId,
            payload: { targetId, actionType: 'IMPROVE_RELATIONS' }
          });
          this.render(container);
        };
      });

      // Sanctions
      container.querySelectorAll('.btn-diplo-sanction').forEach(btn => {
        btn.onclick = () => {
          const targetId = btn.getAttribute('data-target');
          window.WorldForge.Core.Commands.dispatch({
            type: 'DIPLOMATIC_ACTION',
            countryId,
            payload: { targetId, actionType: 'IMPOSE_SANCTIONS' }
          });
          this.render(container);
        };
      });

      // Lift sanctions
      container.querySelectorAll('.btn-diplo-liftsanctions').forEach(btn => {
        btn.onclick = () => {
          const targetId = btn.getAttribute('data-target');
          window.WorldForge.Core.Commands.dispatch({
            type: 'DIPLOMATIC_ACTION',
            countryId,
            payload: { targetId, actionType: 'LIFT_SANCTIONS' }
          });
          this.render(container);
        };
      });
    },

    showWireTransferModal(targetCountryId) {
      const state = window.WorldForge.Core.GameState.getState();
      const target = state.countries[targetCountryId];
      const playerCountry = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!target) return;

      const modalHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <p style="font-size: 11px; color: var(--text-secondary);">
            Przelej bezpośrednio środki z rezerw Twojego Skarbu Państwa do rządu <strong>${target.flag} ${target.namePl}</strong>:
          </p>

          <div class="slider-group">
            <label style="font-size: 11px; font-weight: 500;">Kwota Przelewu (USD):</label>
            <input type="number" id="wire-transfer-amount" class="wf-input" value="500000000" min="10000000" step="50000000" />
            <span style="font-size: 10px; color: var(--text-muted);">Dostępne w Twoim Skarbie: ${window.WorldForge.Format.money(playerCountry.treasury, 'USD')}</span>
          </div>
        </div>
      `;

      window.WorldForge.UI.Modal.show({
        title: `💸 Przelew Rządowy do: ${target.namePl}`,
        contentHtml: modalHtml,
        buttons: [
          { text: 'Anuluj', class: 'wf-btn-secondary', autoClose: true },
          {
            text: 'Wyślij Przelew',
            class: 'wf-btn-primary',
            autoClose: true,
            onClick: () => {
              const amount = parseFloat(document.getElementById('wire-transfer-amount')?.value || 500000000);
              const res = window.WorldForge.Core.Commands.dispatch({
                type: 'TRANSFER_FUNDS',
                countryId: playerCountry.id,
                payload: { targetCountryId: target.id, amount }
              });
              if (!res.success) {
                alert('Przelew nie powiódł się: ' + res.reason);
              }
              window.WorldForge.UI.Navigation.updateTopBar();
              const drawerContent = document.getElementById('right-drawer-content');
              if (drawerContent) DiplomacyUI.render(drawerContent);
            }
          }
        ]
      });
    },

    showSovereignLoanModal(targetCountryId) {
      const state = window.WorldForge.Core.GameState.getState();
      const target = state.countries[targetCountryId];
      const playerCountry = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!target) return;

      const modalHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <p style="font-size: 11px; color: var(--text-secondary);">
            Udziel międzynarodowej pożyczki rządowej dla <strong>${target.flag} ${target.namePl}</strong> z comiesięcznym planem spłat:
          </p>

          <div class="slider-group">
            <label style="font-size: 11px; font-weight: 500;">Kapitał Pożyczki (USD):</label>
            <input type="number" id="loan-principal-amount" class="wf-input" value="2000000000" min="100000000" step="100000000" />
          </div>

          <div class="slider-group">
            <label style="font-size: 11px; font-weight: 500;">Oprocentowanie Roczne (%):</label>
            <input type="number" id="loan-interest-rate" class="wf-input" value="4.5" min="0.5" max="25" step="0.25" />
          </div>

          <div class="slider-group">
            <label style="font-size: 11px; font-weight: 500;">Okres Spłaty:</label>
            <select id="loan-duration-months" class="wf-select">
              <option value="12">12 miesięcy (1 rok)</option>
              <option value="24" selected>24 miesiące (2 lata)</option>
              <option value="36">36 miesięcy (3 lata)</option>
              <option value="60">60 miesięcy (5 lat)</option>
            </select>
          </div>
        </div>
      `;

      window.WorldForge.UI.Modal.show({
        title: `📜 Umowa Pożyczki dla: ${target.namePl}`,
        contentHtml: modalHtml,
        buttons: [
          { text: 'Anuluj', class: 'wf-btn-secondary', autoClose: true },
          {
            text: 'Udziel Pożyczki',
            class: 'wf-btn-primary',
            autoClose: true,
            onClick: () => {
              const principal = parseFloat(document.getElementById('loan-principal-amount')?.value || 2000000000);
              const interestRate = parseFloat(document.getElementById('loan-interest-rate')?.value || 4.5);
              const durationMonths = parseInt(document.getElementById('loan-duration-months')?.value || 24, 10);

              const res = window.WorldForge.Core.Commands.dispatch({
                type: 'OFFER_STATE_LOAN',
                countryId: playerCountry.id,
                payload: {
                  borrowerId: target.id,
                  principal,
                  interestRate,
                  durationMonths
                }
              });

              if (!res.success) {
                alert('Błąd udzielania pożyczki: ' + res.reason);
              }
              window.WorldForge.UI.Navigation.updateTopBar();
              const drawerContent = document.getElementById('right-drawer-content');
              if (drawerContent) DiplomacyUI.render(drawerContent);
            }
          }
        ]
      });
    }
  };

  window.WorldForge.UI.Diplomacy = DiplomacyUI;
})();
