/**
 * WorldForge: Nations - Start Screen & Country Selector UI
 * Offers "Stabilny start", "Realistyczny snapshot", and "Tryb Wieloosobowy (Multiplayer)".
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const StartScreen = {
    selectedCountryId: 'POL',
    activeRegionFilter: 'all',
    searchQuery: '',
    startMode: 'STABLE_START', // 'STABLE_START' | 'REALISTIC_SNAPSHOT'

    render() {
      const container = document.getElementById('start-screen-container');
      if (!container) return;

      const hasSave = window.WorldForge.Core.SaveSystem.hasAnySave();
      const currentDateStr = new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });

      container.innerHTML = `
        <div style="width: 100vw; height: 100vh; display: flex; flex-direction: column; background: var(--bg-main); overflow-y: auto; z-index: 500; position: fixed; top: 0; left: 0;">
          
          <!-- Tactical Grid Overlay -->
          <div style="position: absolute; inset: 0; opacity: 0.05; pointer-events: none; background-image: radial-gradient(#67727e 1px, transparent 1px); background-size: 20px 20px;"></div>

          <!-- Hero Brand Header -->
          <header style="padding: 24px 20px 14px; text-align: center; position: relative; z-index: 10; border-bottom: 1px solid var(--border);">
            <div style="display: inline-flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <svg class="svg-icon" viewBox="0 0 24 24" style="color: var(--accent); width: 22px; height: 22px;">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <h1 style="font-size: 20px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-primary);">
                ${window.WorldForge.GAME_TITLE}
              </h1>
            </div>
            <p style="font-size: 11px; color: var(--text-secondary); letter-spacing: 0.8px; text-transform: uppercase;">
              ${window.WorldForge.SUBTITLE}
            </p>
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              Rozpoczęcie symulacji: <span class="font-mono text-accent">${currentDateStr}</span> • Dane bazowe: <strong>2025/2026</strong>
            </p>
          </header>

          <!-- Main Selection Body -->
          <main id="start-menu-main" style="flex: 1; max-width: 1200px; width: 100%; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; z-index: 10;">
            
            <!-- Game Mode Toggle & Main Navigation Buttons -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; background: var(--bg-panel); padding: 8px 12px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              
              <!-- Mode selector -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">Tryb rozgrywki:</span>
                <button class="map-mode-btn ${this.startMode === 'STABLE_START' ? 'active' : ''}" id="btn-mode-stable" title="Zrównoważony start z bezpiecznym saldem budżetu i stabilnym wzrostem">
                  🛡️ Stabilny start (Domyślny)
                </button>
                <button class="map-mode-btn ${this.startMode === 'REALISTIC_SNAPSHOT' ? 'active' : ''}" id="btn-mode-snapshot" title="Rzeczywiste najnowsze dane statystyczne 2025/2026">
                  📊 Realistyczny snapshot
                </button>
              </div>

              <!-- Action buttons -->
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="wf-btn wf-btn-sm wf-btn-primary" id="btn-open-multiplayer-hub" title="Graj ze znajomym przez sieć / Cloudflare Tunnel">
                  🌐 Tryb Wieloosobowy (Multiplayer)
                </button>
                ${hasSave ? `
                  <button class="wf-btn wf-btn-sm wf-btn-success" id="btn-continue-game">
                    ▶ Kontynuuj Zapis
                  </button>
                ` : ''}
                <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-manage-saves">
                  Stany Gry (Save Slots)
                </button>
                <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-export-json">
                  Eksport JSON
                </button>
                <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-import-json">
                  Import JSON
                </button>
                <input type="file" id="json-file-input" accept=".json" style="display: none;" />
              </div>
            </div>

            <!-- Country Selection Panel -->
            <div class="wf-card" style="padding: 12px;">
              
              <!-- Search and Filter Bar -->
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
                <div style="display: flex; gap: 6px; align-items: center; flex: 1; max-width: 340px;">
                  <span style="color: var(--text-muted); font-size: 11px;">Szukaj:</span>
                  <input type="text" id="country-search-input" class="wf-input" placeholder="Wpisz nazwę państwa, kod ISO lub stolicę..." style="width: 100%;" value="${this.searchQuery}" />
                </div>

                <!-- Region Buttons -->
                <div style="display: flex; gap: 3px; flex-wrap: wrap;" id="region-filter-buttons">
                  ${['all', 'Europa', 'Ameryka Północna', 'Azja', 'Bliski Wschód', 'Ameryka Południowa', 'Afryka', 'Oceania'].map(r => `
                    <button class="map-mode-btn ${this.activeRegionFilter === r ? 'active' : ''}" data-region="${r}">
                      ${r === 'all' ? 'Wszystkie Kraje' : r}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Two Column Selector: Left Country Grid, Right Detail Card -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; min-height: 400px;">
                
                <!-- Country List / Grid -->
                <div id="country-items-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; max-height: 420px; overflow-y: auto; padding-right: 6px;">
                  ${this.renderCountryListHtml()}
                </div>

                <!-- Selected Country Detail Card -->
                <div id="selected-country-preview" style="background: var(--bg-panel); border: 1px solid var(--border); border-radius: var(--border-radius-sm); padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
                  ${this.renderCountryPreviewHtml()}
                </div>

              </div>

            </div>

          </main>

        </div>
      `;

      this.bindEvents();
    },

    renderCountryListHtml() {
      const allCountries = window.WorldForge.Data.Countries || [];
      const query = this.searchQuery.toLowerCase().trim();
      const region = this.activeRegionFilter;

      const filtered = allCountries.filter(c => {
        const matchesQuery = !query || c.namePl.toLowerCase().includes(query) || c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query) || c.capital.toLowerCase().includes(query);
        const matchesRegion = region === 'all' || c.region === region;
        return matchesQuery && matchesRegion;
      });

      if (filtered.length === 0) {
        return '<div style="color: var(--text-muted); grid-column: 1/-1; padding: 20px;">Brak wyników.</div>';
      }

      const F = window.WorldForge.Format;

      return filtered.map(c => {
        const isSelected = c.id === this.selectedCountryId;
        const borderStyle = isSelected ? 'border: 1px solid var(--accent); background: var(--bg-panel-secondary);' : 'border: 1px solid var(--border); background: var(--bg-main);';
        return `
          <div class="country-select-tile" data-country-id="${c.id}" style="padding: 6px 8px; border-radius: var(--border-radius-xs); cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.12s ease; ${borderStyle}">
            <span style="font-size: 16px;">${c.flag}</span>
            <div style="overflow: hidden;">
              <div style="font-weight: 600; font-size: 11px; color: var(--text-primary); white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${c.namePl}</div>
              <div style="font-size: 9px; color: var(--text-muted);" class="font-mono">${F.money(c.gdpNominal, 'USD', { rawText: true })}</div>
            </div>
          </div>
        `;
      }).join('');
    },

    renderCountryPreviewHtml() {
      const allCountries = window.WorldForge.Data.Countries || [];
      const country = allCountries.find(c => c.id === this.selectedCountryId) || allCountries[0];
      if (!country) return '';

      const F = window.WorldForge.Format;
      const difficultyBadge = country.debtToGdp > 100 ? '<span class="wf-badge wf-badge-red">Wysoki Dług</span>' :
                              country.gdpGrowth > 3.0 ? '<span class="wf-badge wf-badge-green">Wzrost</span>' :
                              '<span class="wf-badge wf-badge-cyan">Zrównoważony</span>';

      return `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 28px;">${country.flag}</span>
              <div>
                <h2 style="font-size: 15px; color: var(--text-primary);">${country.namePl} (${country.id})</h2>
                <div style="color: var(--text-muted); font-size: 10px;">Stolica: ${country.capital} • Region: ${country.region}</div>
              </div>
            </div>
            ${difficultyBadge}
          </div>

          <!-- Key Metrics Grid -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 5px 6px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Populacja</span>
              <span class="stat-value text-accent">${F.population(country.population)}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 5px 6px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">PKB Nominalne</span>
              <span class="stat-value text-positive">${F.money(country.gdpNominal, 'USD')}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 5px 6px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">PKB per Capita</span>
              <span class="stat-value">${F.money(country.gdpPerCapita, 'USD')}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 5px 6px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Dług / PKB</span>
              <span class="stat-value ${country.debtToGdp > 80 ? 'text-negative' : 'text-primary'}">${country.debtToGdp.toFixed(1)}%</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 5px 6px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Waluta</span>
              <span class="stat-value font-mono">${country.currency}</span>
            </div>
            <div class="stat-pill" style="background: var(--bg-panel-secondary); padding: 5px 6px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <span class="stat-label">Rating</span>
              <span class="stat-value text-accent">${country.creditRating}</span>
            </div>
          </div>

          <!-- Description & Archetype -->
          <div>
            <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 2px;">Profil Gospodarki:</div>
            <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.35;">${country.economicProfile}</p>
          </div>

          <!-- Metadata -->
          <div style="font-size: 9px; color: var(--text-muted); display: flex; justify-content: space-between;">
            <span>Doktryna bota: <strong class="text-secondary">${country.botArchetype}</strong></span>
            <span>Pewność danych: <em>${country.dataConfidence || country.confidence}</em></span>
          </div>

        </div>

        <!-- Launch Button -->
        <button class="wf-btn wf-btn-primary" id="btn-confirm-start-country" style="width: 100%; padding: 8px; font-size: 12px; margin-top: 8px;">
          Obejmij Rządy nad: ${country.namePl}
        </button>
      `;
    },

    bindEvents() {
      // Multiplayer hub modal trigger
      document.getElementById('btn-open-multiplayer-hub')?.addEventListener('click', () => {
        window.WorldForge.UI.Multiplayer.showLobbyModal();
      });

      // Start mode buttons
      const btnStable = document.getElementById('btn-mode-stable');
      const btnSnapshot = document.getElementById('btn-mode-snapshot');
      if (btnStable && btnSnapshot) {
        btnStable.onclick = () => {
          this.startMode = 'STABLE_START';
          btnStable.classList.add('active');
          btnSnapshot.classList.remove('active');
        };
        btnSnapshot.onclick = () => {
          this.startMode = 'REALISTIC_SNAPSHOT';
          btnSnapshot.classList.add('active');
          btnStable.classList.remove('active');
        };
      }

      // Search input
      const searchInput = document.getElementById('country-search-input');
      if (searchInput) {
        searchInput.oninput = (e) => {
          this.searchQuery = e.target.value;
          const grid = document.getElementById('country-items-grid');
          if (grid) grid.innerHTML = this.renderCountryListHtml();
          this.bindTileClicks();
        };
      }

      // Region filters
      const regionBtns = document.querySelectorAll('#region-filter-buttons button');
      regionBtns.forEach(btn => {
        btn.onclick = () => {
          this.activeRegionFilter = btn.getAttribute('data-region');
          regionBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const grid = document.getElementById('country-items-grid');
          if (grid) grid.innerHTML = this.renderCountryListHtml();
          this.bindTileClicks();
        };
      });

      this.bindTileClicks();

      // Launch button
      const launchBtn = document.getElementById('btn-confirm-start-country');
      if (launchBtn) {
        launchBtn.onclick = () => {
          this.startGameWithCountry(this.selectedCountryId);
        };
      }

      // Continue game button
      const continueBtn = document.getElementById('btn-continue-game');
      if (continueBtn) {
        continueBtn.onclick = () => {
          const latest = window.WorldForge.Core.SaveSystem.getLatestSaveSlot();
          const loaded = window.WorldForge.Core.SaveSystem.loadGame(latest);
          if (loaded) {
            this.hide();
            window.WorldForge.UI.App.onGameStarted();
          }
        };
      }

      // Manage Saves modal
      const manageSavesBtn = document.getElementById('btn-manage-saves');
      if (manageSavesBtn) {
        manageSavesBtn.onclick = () => this.showSaveSlotsModal();
      }

      // Export JSON
      const exportBtn = document.getElementById('btn-export-json');
      if (exportBtn) {
        exportBtn.onclick = () => {
          if (!window.WorldForge.Core.GameState.getState()) {
            window.WorldForge.Core.GameState.createNewGame(this.selectedCountryId);
          }
          window.WorldForge.Core.SaveSystem.exportToJson();
        };
      }

      // Import JSON
      const importBtn = document.getElementById('btn-import-json');
      const fileInput = document.getElementById('json-file-input');
      if (importBtn && fileInput) {
        importBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              const res = window.WorldForge.Core.SaveSystem.importFromJsonText(evt.target.result);
              if (res.success) {
                this.hide();
                window.WorldForge.UI.App.onGameStarted();
              } else {
                window.WorldForge.UI.Modal.showError('Błąd Wczytywania Zapisu', res.reason);
              }
            };
            reader.readAsText(file);
          }
        };
      }
    },

    bindTileClicks() {
      const tiles = document.querySelectorAll('.country-select-tile');
      tiles.forEach(tile => {
        tile.onclick = () => {
          this.selectedCountryId = tile.getAttribute('data-country-id');
          const preview = document.getElementById('selected-country-preview');
          if (preview) preview.innerHTML = this.renderCountryPreviewHtml();
          const grid = document.getElementById('country-items-grid');
          if (grid) grid.innerHTML = this.renderCountryListHtml();
          this.bindTileClicks();

          const launchBtn = document.getElementById('btn-confirm-start-country');
          if (launchBtn) {
            launchBtn.onclick = () => this.startGameWithCountry(this.selectedCountryId);
          }
        };
      });
    },

    startGameWithCountry(countryId) {
      window.WorldForge.Core.GameState.createNewGame(countryId, { startMode: this.startMode });
      this.hide();
      window.WorldForge.UI.App.onGameStarted();
    },

    showSaveSlotsModal() {
      const slots = window.WorldForge.Core.SaveSystem.listSaveSlots();
      const slotsHtml = slots.map(s => {
        if (!s.exists) {
          return `
            <div style="background: var(--bg-panel-secondary); padding: 8px 12px; border-radius: var(--border-radius-xs); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Slot: ${s.slot}</strong>
                <div style="color: var(--text-muted); font-size: 11px;">Pusty slot zapisu</div>
              </div>
              <button class="wf-btn wf-btn-sm wf-btn-secondary" onclick="window.WorldForge.Core.SaveSystem.saveGame('${s.slot}'); window.WorldForge.UI.Modal.close(); window.WorldForge.UI.StartScreen.showSaveSlotsModal();">
                Zapisz tutaj
              </button>
            </div>
          `;
        }
        return `
          <div style="background: var(--bg-panel-secondary); padding: 8px 12px; border-radius: var(--border-radius-xs); border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Slot: ${s.slot}</strong> • <span>${s.playerFlag} ${s.playerCountryName}</span>
              <div style="color: var(--text-muted); font-size: 11px;">Data: ${s.dateFormatted} (Tura ${s.turn})</div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="wf-btn wf-btn-sm wf-btn-primary" onclick="window.WorldForge.Core.SaveSystem.loadGame('${s.slot}'); window.WorldForge.UI.Modal.close(); window.WorldForge.UI.StartScreen.hide(); window.WorldForge.UI.App.onGameStarted();">
                Wczytaj
              </button>
              <button class="wf-btn wf-btn-sm wf-btn-secondary" onclick="window.WorldForge.Core.SaveSystem.saveGame('${s.slot}'); window.WorldForge.UI.Modal.close(); window.WorldForge.UI.StartScreen.showSaveSlotsModal();">
                Nadpisz
              </button>
              <button class="wf-btn wf-btn-sm wf-btn-danger" onclick="window.WorldForge.Core.SaveSystem.deleteSave('${s.slot}'); window.WorldForge.UI.Modal.close(); window.WorldForge.UI.StartScreen.showSaveSlotsModal();">
                Usuń
              </button>
            </div>
          </div>
        `;
      }).join('');

      window.WorldForge.UI.Modal.show({
        title: 'Stany Gry (Save Slots)',
        contentHtml: `<div style="display: flex; flex-direction: column; gap: 8px;">${slotsHtml}</div>`
      });
    },

    hide() {
      const container = document.getElementById('start-screen-container');
      if (container) container.style.display = 'none';
    },

    show() {
      const container = document.getElementById('start-screen-container');
      if (container) {
        container.style.display = 'flex';
        this.render();
      }
    }
  };

  window.WorldForge.UI.StartScreen = StartScreen;
})();
