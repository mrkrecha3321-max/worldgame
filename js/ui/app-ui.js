/**
 * WorldForge: Nations - Main UI Orchestrator
 * Map-centric viewport management, resizable drawer with drag handle,
 * fullscreen toggle, keyboard shortcuts and state synchronization.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const AppUI = {
    selectedCountryId: null,
    isDrawerResizing: false,
    drawerWidth: 460,

    init() {
      console.log('[AppUI] Inicjalizacja interfejsu strategicznego...');
      this.bindKeyboardShortcuts();
      this.bindEngineEvents();
      this.bindCommandEvents();
      this.bindDrawerResizer();
    },

    onGameStarted() {
      this.selectedCountryId = window.WorldForge.Core.GameState.state.playerCountryId;

      // 1. Initialize Top & Bottom navigation
      window.WorldForge.UI.Navigation.init();
      window.WorldForge.UI.Navigation.updateTopBar();

      // 2. Render Fullscreen Central World Map (occupies 60%-80%+ of workspace)
      const mapContainer = document.getElementById('map-viewport');
      if (mapContainer) {
        window.WorldForge.UI.WorldMap.render(mapContainer);
      }

      // 3. Render Right Analytical Drawer with Executive Overview
      this.renderActiveTab(window.WorldForge.UI.Navigation.activeTabId);

      // 4. Start Simulation Engine
      window.WorldForge.Core.TurnEngine.start();
    },

    bindDrawerResizer() {
      const drawer = document.getElementById('right-drawer');
      const handle = document.getElementById('drawer-resize-handle');
      if (!drawer || !handle) return;

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.isDrawerResizing = true;
        handle.classList.add('is-resizing');
        document.body.style.cursor = 'ew-resize';
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isDrawerResizing) return;
        const newWidth = Math.max(340, Math.min(window.innerWidth - 60, window.innerWidth - e.clientX));
        this.drawerWidth = newWidth;
        drawer.style.width = `${newWidth}px`;
      });

      window.addEventListener('mouseup', () => {
        if (this.isDrawerResizing) {
          this.isDrawerResizing = false;
          handle.classList.remove('is-resizing');
          document.body.style.cursor = 'default';
        }
      });
    },

    renderActiveTab(tabId) {
      const drawer = document.getElementById('right-drawer');
      const drawerTitle = document.getElementById('drawer-active-title');
      const drawerContent = document.getElementById('right-drawer-content');
      if (!drawerContent) return;

      if (drawer) drawer.classList.remove('collapsed');

      const navItem = window.WorldForge.UI.Navigation.NAV_ITEMS.find(i => i.id === tabId);
      if (drawerTitle && navItem) {
        drawerTitle.textContent = navItem.label;
      }

      // If Exchange is opened, expand drawer width for maximum analytics view
      if (tabId === 'exchange') {
        drawer.style.width = 'min(900px, calc(100vw - 60px))';
      } else {
        drawer.style.width = `${this.drawerWidth || 460}px`;
      }

      switch (tabId) {
        case 'overview':
          window.WorldForge.UI.Overview.render(drawerContent);
          break;
        case 'exchange':
          window.WorldForge.UI.Exchange.render(drawerContent);
          break;
        case 'budget':
        case 'taxes':
          window.WorldForge.UI.Budget.render(drawerContent);
          break;
        case 'banking':
          window.WorldForge.UI.Banking.render(drawerContent);
          break;
        case 'economy':
          window.WorldForge.UI.Economy.render(drawerContent);
          break;
        case 'trade':
          window.WorldForge.UI.Trade.render(drawerContent);
          break;
        case 'space':
          window.WorldForge.UI.Space.render(drawerContent);
          break;
        case 'conflict':
          window.WorldForge.UI.Conflict.render(drawerContent);
          break;
        case 'population':
          window.WorldForge.UI.Population.render(drawerContent);
          break;
        case 'infrastructure':
          window.WorldForge.UI.Infrastructure.render(drawerContent);
          break;
        case 'research':
          window.WorldForge.UI.Research.render(drawerContent);
          break;
        case 'military':
          window.WorldForge.UI.Military.render(drawerContent);
          break;
        case 'diplomacy':
          window.WorldForge.UI.Diplomacy.render(drawerContent);
          break;
        case 'reports':
          window.WorldForge.UI.Reports.render(drawerContent);
          break;
        default:
          window.WorldForge.UI.Overview.render(drawerContent);
          break;
      }
    },

    onCountrySelectedOnMap(countryId) {
      this.selectedCountryId = countryId;
      const state = window.WorldForge.Core.GameState.getState();
      const playerCountry = window.WorldForge.Core.GameState.getPlayerCountry();
      const country = state.countries[countryId];
      if (!country) return;

      const drawer = document.getElementById('right-drawer');
      const drawerTitle = document.getElementById('drawer-active-title');
      const drawerContent = document.getElementById('right-drawer-content');
      if (!drawerContent) return;

      if (drawer) drawer.classList.remove('collapsed');
      if (drawerTitle) drawerTitle.textContent = `Dossier: ${country.namePl} (${country.id})`;

      const F = window.WorldForge.Format;
      const isPlayer = country.id === playerCountry.id;
      const relScore = isPlayer ? 100 : (playerCountry.diplomacy?.relations[country.id] || 0);

      drawerContent.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Country Brief Card -->
          <div class="wf-card" style="border-left: 3px solid ${isPlayer ? 'var(--accent)' : 'var(--border)'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">${country.flag}</span>
                <div>
                  <strong style="font-size: 14px;">${country.namePl} (${country.id})</strong>
                  <div style="font-size: 11px; color: var(--text-muted);">Stolica: ${country.capital} • Region: ${country.region}</div>
                </div>
              </div>
              <span class="wf-badge ${isPlayer ? 'wf-badge-cyan' : 'wf-badge-amber'}">${isPlayer ? 'Twoje Państwo' : 'Suwerenne Państwo'}</span>
            </div>
          </div>

          <!-- Key Financial & Macro Metrics -->
          <div class="grid-2">
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">PKB Nominalne</span>
              <span class="stat-value text-positive">${F.money(country.economy.gdpNominal, 'USD')}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Dług Publiczny / PKB</span>
              <span class="stat-value ${country.debt.debtToGdp > 80 ? 'text-negative' : 'text-primary'}">${country.debt.debtToGdp.toFixed(1)}%</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Inflacja (CPI)</span>
              <span class="stat-value">${country.economy.inflation.toFixed(1)}%</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 6px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Populacja</span>
              <span class="stat-value text-accent">${F.population(country.population.total)}</span>
            </div>
          </div>

          <!-- Geopolitical & Diplomatic Standing -->
          <div class="wf-card">
            <div class="card-header">
              <span class="card-title">Status Geopolityczny</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between;">
                <span>Ustrój polityczny:</span>
                <strong class="text-primary">${country.governmentType}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Waluta krajowa:</span>
                <strong class="font-mono text-accent">${country.currency} (1$ = ${country.currencyExchangeRate.toFixed(2)})</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Stosunki z rządem gracza:</span>
                <strong class="${relScore > 0 ? 'text-positive' : 'text-negative'}">${relScore > 0 ? '+' : ''}${relScore} / 100</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Doktryna strategiczna:</span>
                <strong class="text-secondary">${country.botArchetype}</strong>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4; background: var(--bg-panel-secondary); padding: 8px 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
            ${country.economicProfile}
          </div>

          <!-- Quick Actions -->
          ${!isPlayer ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px;">
              <button class="wf-btn wf-btn-primary wf-btn-sm" onclick="window.WorldForge.UI.Navigation.switchTab('diplomacy')">
                Dyplomacja / Przelewy
              </button>
              <button class="wf-btn wf-btn-secondary wf-btn-sm" onclick="window.WorldForge.UI.Navigation.switchTab('trade')">
                Kontrakty Handlowe
              </button>
              <button class="wf-btn wf-btn-danger wf-btn-sm" style="grid-column: 1/-1;" onclick="window.WorldForge.UI.Navigation.switchTab('conflict')">
                🕵️ Wywiad i Uderzenia
              </button>
            </div>
          ` : `
            <button class="wf-btn wf-btn-primary wf-btn-sm" onclick="window.WorldForge.UI.Navigation.switchTab('budget')">
              Przejdź do Budżetu Krajowego
            </button>
          `}

        </div>
      `;
    },

    bindEngineEvents() {
      const TurnEngine = window.WorldForge.Core.TurnEngine;

      TurnEngine.on('tick', (data) => {
        window.WorldForge.UI.Navigation.updateTimeline(data);
      });

      TurnEngine.on('turnCompleted', (data) => {
        window.WorldForge.UI.Navigation.updateTopBar();
        
        const mapContainer = document.getElementById('map-viewport');
        if (mapContainer) {
          window.WorldForge.UI.WorldMap.render(mapContainer);
        }

        this.renderActiveTab(window.WorldForge.UI.Navigation.activeTabId);
        
        if (data.report) {
          window.WorldForge.UI.Reports.showTurnReportModal(data.report);
        }
      });
    },

    bindCommandEvents() {
      window.WorldForge.Core.Commands.on('commandExecuted', () => {
        window.WorldForge.UI.Navigation.updateTopBar();
        this.renderActiveTab(window.WorldForge.UI.Navigation.activeTabId);
      });
    },

    bindKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          window.WorldForge.Core.TurnEngine.togglePause();
        } else if (e.key === '1') {
          window.WorldForge.Core.TurnEngine.setSpeed(1);
        } else if (e.key === '2') {
          window.WorldForge.Core.TurnEngine.setSpeed(2);
        } else if (e.key === '4') {
          window.WorldForge.Core.TurnEngine.setSpeed(4);
        } else if (e.code === 'Enter') {
          window.WorldForge.Core.TurnEngine.nextTurn();
        }
      });
    }
  };

  window.WorldForge.UI.App = AppUI;
})();
