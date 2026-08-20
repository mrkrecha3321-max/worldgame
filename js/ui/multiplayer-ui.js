/**
 * WorldForge: Nations - Multiplayer Hub & Lobby UI v2.1
 * Features:
 * - Room code normalization (WF-XXXX, XXXX, lowercase, spaces)
 * - Friendly structured error alerts without browser alert()
 * - Full country selection across all 184 nations on Create & Join
 * - Prevention of duplicate event listeners
 * - Host start game readiness and country conflict validation
 * - Connection status indicators and auto-reconnect banners
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const MultiplayerUI = {
    activeTab: 'create', // 'create' | 'join' | 'cloudflare'
    listenersBound: false,
    errorMessage: null,
    isLoading: false,
    loadingText: '',

    showLobbyModal() {
      const net = window.WorldForge.Network;

      this.bindNetworkEvents();

      // If already in a room, render lobby
      if (net.currentRoom) {
        this.renderModalContent();
        return;
      }

      // Auto-connect if needed
      if (!net.isConnected) {
        this.isLoading = true;
        this.loadingText = 'Łączenie z serwerem multiplayer...';
        this.renderModalContent();

        net.connect().then(() => {
          this.isLoading = false;
          this.loadingText = '';
          this.errorMessage = null;
          this.renderModalContent();
        }).catch(err => {
          this.isLoading = false;
          this.loadingText = '';
          this.errorMessage = 'Nie udało się nawiązać połączenia z serwerem WebSocket. Upewnij się, że serwer jest uruchomiony (`node server.js`).';
          this.renderModalContent();
        });
      } else {
        this.renderModalContent();
      }
    },

    renderModalContent() {
      const net = window.WorldForge.Network;
      const countries = window.WorldForge.Data.Countries || [];

      let bodyHtml = '';

      // Loading state banner
      const loadingHtml = this.isLoading ? `
        <div style="background: var(--bg-panel-secondary); border: 1px solid var(--border); padding: 8px 12px; border-radius: var(--border-radius-xs); font-size: 11px; color: var(--accent); display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--accent);"></span>
          <span>${this.loadingText || 'Łączenie...'}</span>
        </div>
      ` : '';

      // Error message box
      const errorHtml = this.errorMessage ? `
        <div style="background: var(--negative-bg); border: 1px solid var(--negative-border); padding: 8px 12px; border-radius: var(--border-radius-xs); font-size: 11px; color: #ffffff; display: flex; justify-content: space-between; align-items: center;">
          <span>⚠️ ${this.errorMessage}</span>
          <button class="wf-btn wf-btn-sm wf-btn-secondary" style="padding: 1px 6px; font-size: 10px;" id="btn-dismiss-mp-error">✕</button>
        </div>
      ` : '';

      if (net.currentRoom) {
        // === ROOM LOBBY VIEW ===
        const room = net.currentRoom;
        const myPlayer = room.players.find(p => p.id === net.clientId || p.sessionToken === net.sessionToken);
        const takenCountries = room.players.map(p => p.countryId);

        // Validation for Host Start
        const disconnectedCount = room.players.filter(p => !p.connected).length;
        const unreadyCount = room.players.filter(p => !p.isHost && !p.ready).length;
        const hasDuplicateCountries = new Set(takenCountries).size !== takenCountries.length;
        
        let canHostStart = (disconnectedCount === 0 && unreadyCount === 0 && !hasDuplicateCountries);
        let startValidationReason = '';
        if (disconnectedCount > 0) startValidationReason = 'Niektórzy gracze są rozłączeni';
        else if (unreadyCount > 0) startValidationReason = `Oczekiwanie na gotowość (${unreadyCount} graczy)`;
        else if (hasDuplicateCountries) startValidationReason = 'Konflikt państw: dwóch graczy wybrało ten sam kraj';

        bodyHtml = `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${loadingHtml}
            ${errorHtml}

            <!-- Room Info Strip -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-panel-secondary); padding: 8px 12px; border-radius: var(--border-radius-xs); border: 1px solid var(--border);">
              <div>
                <strong style="font-size: 13px; color: var(--accent);">${room.name}</strong>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  Kod Pokoju: <span class="font-mono text-positive" style="font-weight: 700; font-size: 13px; letter-spacing: 0.5px;">${room.id}</span>
                  <button class="wf-btn wf-btn-sm wf-btn-secondary" id="btn-copy-room-code" style="margin-left: 6px; padding: 1px 6px; font-size: 10px;" title="Skopiuj kod">Kopiuj</button>
                </div>
              </div>
              <span class="wf-badge wf-badge-cyan">${room.players.length} / 32 Graczy</span>
            </div>

            <!-- Players Table in Lobby -->
            <div class="wf-table-container">
              <table class="wf-table">
                <thead>
                  <tr>
                    <th>Gracz</th>
                    <th>Wybrane Państwo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${room.players.map(p => {
                    const isMe = (p.id === net.clientId || p.sessionToken === net.sessionToken);
                    const c = countries.find(cnt => cnt.id === p.countryId);
                    return `
                      <tr>
                        <td>
                          <strong>${p.name}</strong>
                          ${p.isHost ? '<span class="wf-badge wf-badge-amber" style="margin-left: 4px;">Host</span>' : ''}
                          ${isMe ? '<span class="wf-badge wf-badge-cyan" style="margin-left: 4px;">Ty</span>' : ''}
                          ${!p.connected ? '<span class="wf-badge wf-badge-red" style="margin-left: 4px;">Rozłączony</span>' : ''}
                        </td>
                        <td>
                          ${isMe ? `
                            <select class="wf-select" id="lobby-change-country-select" style="padding: 2px 6px; font-size: 11px; max-width: 220px;">
                              ${countries.map(cntry => {
                                const isTakenByOther = room.players.some(other => other.id !== p.id && other.countryId === cntry.id);
                                return `
                                  <option value="${cntry.id}" ${cntry.id === p.countryId ? 'selected' : ''} ${isTakenByOther ? 'disabled' : ''}>
                                    ${cntry.flag} ${cntry.namePl} (${cntry.id})${isTakenByOther ? ' - Zajęte' : ''}
                                  </option>
                                `;
                              }).join('')}
                            </select>
                          ` : `
                            <span>${c?.flag || '🌐'} ${c?.namePl || p.countryId}</span>
                          `}
                        </td>
                        <td>
                          ${!p.connected ? '<span class="wf-badge wf-badge-red">Rozłączony (60s)</span>' :
                            p.ready ? '<span class="wf-badge wf-badge-green">Gotowy</span>' :
                            '<span class="wf-badge wf-badge-amber">Wybiera</span>'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Ready / Start Game Controls -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; border-top: 1px solid var(--border); padding-top: 8px;">
              <div style="display: flex; gap: 6px;">
                <button class="wf-btn wf-btn-secondary wf-btn-sm" id="btn-lobby-toggle-ready">
                  ${myPlayer?.ready ? '✓ Gotowy (Kliknij by cofnąć)' : 'Zgłoś Gotowość'}
                </button>
              </div>

              ${net.isHost ? `
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                  <button class="wf-btn wf-btn-primary" id="btn-host-launch-game" ${!canHostStart ? 'disabled' : ''} style="padding: 6px 14px;">
                    Rozpocznij Rozgrywkę
                  </button>
                  ${!canHostStart ? `<span style="font-size: 10px; color: var(--warning); margin-top: 2px;">${startValidationReason}</span>` : ''}
                </div>
              ` : `
                <span style="font-size: 11px; color: var(--text-muted);">Oczekiwanie na start przez Hosta...</span>
              `}
            </div>
          </div>
        `;
      } else {
        // === CREATE / JOIN TABS VIEW ===
        bodyHtml = `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${loadingHtml}
            ${errorHtml}

            <!-- Navigation Tabs -->
            <div style="display: flex; gap: 4px; border-bottom: 1px solid var(--border); padding-bottom: 6px;">
              <button class="map-mode-btn ${this.activeTab === 'create' ? 'active' : ''}" id="tab-mp-create">Stwórz Pokój (Host)</button>
              <button class="map-mode-btn ${this.activeTab === 'join' ? 'active' : ''}" id="tab-mp-join">Dołącz do Pokoju</button>
              <button class="map-mode-btn ${this.activeTab === 'cloudflare' ? 'active' : ''}" id="tab-mp-cf">☁️ Cloudflare Tunnel</button>
            </div>

            ${this.activeTab === 'create' ? `
              <!-- Create Room Form -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <label style="font-size: 11px; font-weight: 500;">Twój Pseudonim (Nick):</label>
                  <input type="text" id="mp-create-player-name" class="wf-input" value="${net.myPlayerName}" />
                </div>
                <div class="slider-group">
                  <label style="font-size: 11px; font-weight: 500;">Nazwa Pokoju:</label>
                  <input type="text" id="mp-create-room-name" class="wf-input" value="Pokój Gry #${Math.floor(Math.random()*900+100)}" />
                </div>
                <div class="grid-2">
                  <div class="slider-group">
                    <label style="font-size: 11px; font-weight: 500;">Twoje Państwo:</label>
                    <select id="mp-create-country" class="wf-select">
                      ${countries.map(c => `
                        <option value="${c.id}" ${c.id === 'POL' ? 'selected' : ''}>${c.flag} ${c.namePl} (${c.id})</option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="slider-group">
                    <label style="font-size: 11px; font-weight: 500;">Czas Rundy (Sekundy):</label>
                    <select id="mp-create-turn-time" class="wf-select">
                      <option value="60">1 Minuta (Szybka)</option>
                      <option value="120">2 Minuty</option>
                      <option value="180" selected>3 Minuty (Standard)</option>
                      <option value="300">5 Minut</option>
                    </select>
                  </div>
                </div>
                <button class="wf-btn wf-btn-primary" id="btn-submit-create-room" ${this.isLoading ? 'disabled' : ''} style="margin-top: 4px;">
                  ${this.isLoading ? 'Łączenie...' : 'Utwórz Pokój i Przejdź do Lobby'}
                </button>
              </div>
            ` : this.activeTab === 'join' ? `
              <!-- Join Room Form with Country Picker -->
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div class="slider-group">
                  <label style="font-size: 11px; font-weight: 500;">Twój Pseudonim (Nick):</label>
                  <input type="text" id="mp-join-player-name" class="wf-input" value="${net.myPlayerName}" />
                </div>
                <div class="grid-2">
                  <div class="slider-group">
                    <label style="font-size: 11px; font-weight: 500;">Kod Pokoju (np. WF-ABCD lub ABCD):</label>
                    <input type="text" id="mp-join-room-code" class="wf-input font-mono" placeholder="Wpisz kod pokoju..." style="text-transform: uppercase;" />
                  </div>
                  <div class="slider-group">
                    <label style="font-size: 11px; font-weight: 500;">Preferowane Państwo:</label>
                    <select id="mp-join-country" class="wf-select">
                      ${countries.map(c => `
                        <option value="${c.id}" ${c.id === 'DEU' ? 'selected' : ''}>${c.flag} ${c.namePl} (${c.id})</option>
                      `).join('')}
                    </select>
                  </div>
                </div>
                <button class="wf-btn wf-btn-primary" id="btn-submit-join-room" ${this.isLoading ? 'disabled' : ''} style="margin-top: 4px;">
                  ${this.isLoading ? 'Łączenie...' : 'Dołącz do Pokoju'}
                </button>
              </div>
            ` : `
              <!-- Cloudflare / Host Instructions Guide -->
              <div style="background: var(--bg-panel-secondary); padding: 10px; border-radius: var(--border-radius-xs); border: 1px solid var(--border); font-size: 11px; line-height: 1.45;">
                <strong style="color: var(--accent); font-size: 12px;">Jak połączyć się ze znajomym przez Cloudflare Tunnel:</strong>
                <ol style="margin-top: 6px; padding-left: 16px;">
                  <li>Uruchom serwer na swoim komputerze: <code class="font-mono" style="background: var(--bg-input); padding: 1px 4px;">node server.js</code></li>
                  <li>W nowym oknie wpisz:
                    <div style="background: var(--bg-input); padding: 5px; margin: 4px 0; border-radius: 3px; font-family: var(--font-mono); color: var(--positive);">
                      npx cloudflared tunnel --url http://localhost:8080
                    </div>
                  </li>
                  <li>Skopiuj wygenerowany link HTTPS (np. <code class="font-mono">https://random.trycloudflare.com</code>) i wyślij znajomemu.</li>
                  <li>Obaj otwieracie ten sam link w przeglądarce i dołączacie do pokoju!</li>
                </ol>
              </div>
            `}

          </div>
        `;
      }

      window.WorldForge.UI.Modal.show({
        title: 'Centrum Rozgrywki Wieloosobowej (Multiplayer)',
        contentHtml: bodyHtml,
        buttons: [{ text: 'Zamknij', class: 'wf-btn-secondary', autoClose: true }]
      });

      this.bindModalEvents();
    },

    bindModalEvents() {
      const net = window.WorldForge.Network;

      // Error dismiss
      document.getElementById('btn-dismiss-mp-error')?.addEventListener('click', () => {
        this.errorMessage = null;
        this.renderModalContent();
      });

      // Tab switchers
      document.getElementById('tab-mp-create')?.addEventListener('click', () => {
        this.activeTab = 'create';
        this.errorMessage = null;
        this.renderModalContent();
      });
      document.getElementById('tab-mp-join')?.addEventListener('click', () => {
        this.activeTab = 'join';
        this.errorMessage = null;
        this.renderModalContent();
      });
      document.getElementById('tab-mp-cf')?.addEventListener('click', () => {
        this.activeTab = 'cloudflare';
        this.errorMessage = null;
        this.renderModalContent();
      });

      // Copy Room Code
      document.getElementById('btn-copy-room-code')?.addEventListener('click', () => {
        if (net.currentRoom) {
          navigator.clipboard?.writeText(net.currentRoom.id);
          window.WorldForge.UI.Notifications?.showToast('Skopiowano Kod Pokoju', `Kod ${net.currentRoom.id} skopiowany do schowka.`, 'info');
        }
      });

      // Submit Create Room
      document.getElementById('btn-submit-create-room')?.addEventListener('click', async () => {
        const roomName = document.getElementById('mp-create-room-name')?.value || 'Pokój Gry';
        const playerName = document.getElementById('mp-create-player-name')?.value || 'Gracz 1';
        const countryId = document.getElementById('mp-create-country')?.value || 'POL';
        const turnDuration = parseInt(document.getElementById('mp-create-turn-time')?.value || 180, 10);

        this.isLoading = true;
        this.loadingText = 'Tworzenie pokoju na serwerze...';
        this.renderModalContent();

        try {
          await net.createRoom(roomName, countryId, playerName, null, turnDuration);
          this.isLoading = false;
          this.errorMessage = null;
          this.renderModalContent();
        } catch (err) {
          this.isLoading = false;
          this.errorMessage = err.message || 'Nie udało się utworzyć pokoju.';
          this.renderModalContent();
        }
      });

      // Submit Join Room
      document.getElementById('btn-submit-join-room')?.addEventListener('click', async () => {
        const rawCode = document.getElementById('mp-join-room-code')?.value || '';
        const playerName = document.getElementById('mp-join-player-name')?.value || 'Gracz 2';
        const countryId = document.getElementById('mp-join-country')?.value || 'DEU';

        if (!rawCode.trim()) {
          this.errorMessage = 'Wpisz kod pokoju (np. WF-ABCD lub ABCD).';
          this.renderModalContent();
          return;
        }

        this.isLoading = true;
        this.loadingText = 'Dołączanie do pokoju...';
        this.renderModalContent();

        try {
          await net.joinRoom(rawCode, countryId, playerName);
          this.isLoading = false;
          this.errorMessage = null;
          this.renderModalContent();
        } catch (err) {
          this.isLoading = false;
          this.errorMessage = err.message || 'Nie udało się dołączyć do pokoju.';
          this.renderModalContent();
        }
      });

      // Change Country in Lobby
      document.getElementById('lobby-change-country-select')?.addEventListener('change', (e) => {
        net.selectCountry(e.target.value);
      });

      // Toggle Ready
      document.getElementById('btn-lobby-toggle-ready')?.addEventListener('click', () => {
        net.toggleReady();
      });

      // Host Launch Game
      document.getElementById('btn-host-launch-game')?.addEventListener('click', () => {
        net.startGame();
      });
    },

    bindNetworkEvents() {
      if (this.listenersBound) return;
      this.listenersBound = true;

      const net = window.WorldForge.Network;

      net.on('roomCreated', () => {
        this.errorMessage = null;
        this.renderModalContent();
      });

      net.on('roomJoined', () => {
        this.errorMessage = null;
        this.renderModalContent();
      });

      net.on('lobbyUpdate', () => {
        this.renderModalContent();
      });

      net.on('countryChanged', () => {
        this.renderModalContent();
      });

      net.on('gameStarted', (data) => {
        window.WorldForge.UI.Modal.close();
        window.WorldForge.UI.StartScreen?.hide();
        window.WorldForge.UI.App.onGameStarted();
        window.WorldForge.UI.Notifications?.showToast('Rozgrywka Wystartowała', `Grasz jako ${data.myCountryId}.`, 'success');
      });

      net.on('error', (err) => {
        this.errorMessage = (typeof err === 'string') ? err : (err.message || 'Wystąpił błąd sieciowy.');
        this.isLoading = false;
        this.renderModalContent();
      });

      net.on('reconnecting', (data) => {
        window.WorldForge.UI.Notifications?.showToast('Utrata Połączenia', `Przywracanie połączenia z serwerem... (próba #${data.attempt})`, 'warning');
      });

      net.on('reconnected', (data) => {
        window.WorldForge.UI.Notifications?.showToast('Połączenie Przywrócone', `Pomyślnie wznowiono sesję w pokoju ${data.room.id}.`, 'success');
        if (data.room.status === 'PLAYING') {
          window.WorldForge.UI.Modal.close();
          window.WorldForge.UI.StartScreen?.hide();
          window.WorldForge.UI.App.onGameStarted();
        } else {
          this.renderModalContent();
        }
      });
    }
  };

  window.WorldForge.UI.Multiplayer = MultiplayerUI;
})();
