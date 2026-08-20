/**
 * WorldForge: Nations - Multiplayer Network Client v2.1
 * Manages WebSocket connection, session tokens, exponential reconnect,
 * async Room Promises and authoritative command forwarding.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  function normalizeRoomCode(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const cleaned = raw.toUpperCase().replace(/[\s\-_]/g, '');
    if (cleaned.startsWith('WF') && cleaned.length >= 6) {
      const suffix = cleaned.slice(2);
      if (/^[A-Z0-9]{4,6}$/.test(suffix)) {
        return `WF-${suffix}`;
      }
    } else if (/^[A-Z0-9]{4,6}$/.test(cleaned)) {
      return `WF-${cleaned}`;
    }
    return null;
  }

  function getOrCreateSessionToken() {
    let token = null;
    try {
      token = sessionStorage.getItem('wf_session_token');
    } catch (e) {}
    if (!token) {
      token = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
      try {
        sessionStorage.setItem('wf_session_token', token);
      } catch (e) {}
    }
    return token;
  }

  class NetworkClient {
    constructor() {
      this.ws = null;
      this.isConnected = false;
      this.isConnecting = false;
      this.isMultiplayer = false;
      this.clientId = null;
      this.sessionToken = getOrCreateSessionToken();
      this.currentRoom = null;
      this.isHost = false;
      this.myPlayerName = 'Przywódca ' + Math.floor(Math.random() * 100);
      this.myCountryId = 'POL';
      this.subscribers = [];
      this.serverUrl = null;
      this.reconnectAttempts = 0;
      this.reconnectTimer = null;
      this.isReconnecting = false;
      this.pendingRequests = new Map(); // reqId -> { resolve, reject, timer }
      this.heartbeatTimer = null;
    }

    /**
     * Auto-detect and connect via WebSocket (works over Cloudflare Tunnel / Localhost / HTTPS)
     */
    connect(customUrl = null) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return Promise.resolve(this.clientId);
      }

      if (this.isConnecting && this.connectPromise) {
        return this.connectPromise;
      }

      this.isConnecting = true;

      this.connectPromise = new Promise((resolve, reject) => {
        try {
          let wsUrl = customUrl;
          if (!wsUrl) {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host || 'localhost:8080';
            wsUrl = `${proto}//${host}`;
          }
          this.serverUrl = wsUrl;

          console.log(`[NetworkClient] Łączenie z serwerem: ${wsUrl}...`);
          this.ws = new WebSocket(wsUrl);

          const connectTimeout = setTimeout(() => {
            if (this.isConnecting) {
              this.isConnecting = false;
              reject(new Error('Przekroczono limit czasu połączenia z serwerem (Timeout)'));
            }
          }, 8000);

          this.ws.onopen = () => {
            clearTimeout(connectTimeout);
            this.isConnecting = false;
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            console.log('[NetworkClient] Połączono z serwerem WebSocket.');
            this.emit('connected', { url: wsUrl });

            // Start client heartbeat ping
            if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = setInterval(() => {
              if (this.isConnected) this.send('PING');
            }, 10000);
          };

          this.ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              this.handleServerMessage(msg);
              if (msg.type === 'CONNECTED') {
                this.clientId = msg.clientId;
                resolve(this.clientId);

                // Check if we have an active room to auto-resume
                if (this.sessionToken && this.currentRoom) {
                  this.send('RECONNECT_SESSION', { sessionToken: this.sessionToken });
                }
              }
            } catch (e) {
              console.error('[NetworkClient] Błąd parsowania wiadomości serwera:', e);
            }
          };

          this.ws.onerror = (err) => {
            clearTimeout(connectTimeout);
            this.isConnecting = false;
            this.isConnected = false;
            this.emit('error', err);
            reject(err);
          };

          this.ws.onclose = () => {
            clearTimeout(connectTimeout);
            this.isConnecting = false;
            this.isConnected = false;
            if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
            this.emit('disconnected');

            // Trigger auto-reconnect if in active multiplayer game or room
            if (this.isMultiplayer && !this.isReconnecting) {
              this.scheduleReconnect();
            }
          };
        } catch (err) {
          this.isConnecting = false;
          reject(err);
        }
      });

      return this.connectPromise;
    }

    scheduleReconnect() {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
      const delayMs = Math.min(10000, Math.pow(2, this.reconnectAttempts - 1) * 1000);

      this.emit('reconnecting', {
        attempt: this.reconnectAttempts,
        delayMs: delayMs
      });

      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        console.log(`[NetworkClient] Próba ponownego połączenia #${this.reconnectAttempts}...`);
        this.connect().catch(() => {
          if (this.isMultiplayer) {
            this.scheduleReconnect();
          }
        });
      }, delayMs);
    }

    ensureConnected() {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        return Promise.resolve(this.clientId);
      }
      return this.connect();
    }

    send(type, payload = {}) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return false;
      }
      this.ws.send(JSON.stringify({
        type,
        sessionToken: this.sessionToken,
        ...payload
      }));
      return true;
    }

    /**
     * Create room (Async Promise)
     */
    async createRoom(roomName, countryId = 'POL', playerName = null, password = null, turnDuration = 180, startMode = 'STABLE_START') {
      await this.ensureConnected();

      if (playerName) this.myPlayerName = playerName;
      this.myCountryId = countryId;

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete('CREATE_ROOM');
          reject(new Error('Serwer nie odpowiedział na żądanie utworzenia pokoju (Timeout)'));
        }, 8000);

        this.pendingRequests.set('CREATE_ROOM', { resolve, reject, timeout });

        this.send('CREATE_ROOM', {
          roomName,
          countryId,
          playerName: this.myPlayerName,
          password,
          turnDuration,
          startMode
        });
      });
    }

    /**
     * Join room (Async Promise)
     */
    async joinRoom(rawRoomCode, countryId = 'DEU', playerName = null, password = null) {
      const normalizedCode = normalizeRoomCode(rawRoomCode);
      if (!normalizedCode) {
        return Promise.reject({
          code: 'INVALID_ROOM_CODE',
          message: 'Nieprawidłowy kod pokoju. Kod powinien mieć format np. WF-ABCD lub ABCD.'
        });
      }

      await this.ensureConnected();

      if (playerName) this.myPlayerName = playerName;
      this.myCountryId = countryId;

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete('JOIN_ROOM');
          reject(new Error('Serwer nie odpowiedział na żądanie dołączenia (Timeout)'));
        }, 8000);

        this.pendingRequests.set('JOIN_ROOM', { resolve, reject, timeout });

        this.send('JOIN_ROOM', {
          roomId: normalizedCode,
          countryId: this.myCountryId,
          playerName: this.myPlayerName,
          password
        });
      });
    }

    listRooms() {
      return this.ensureConnected().then(() => {
        this.send('LIST_ROOMS');
      });
    }

    selectCountry(countryId) {
      return this.send('SELECT_COUNTRY', { countryId });
    }

    toggleReady() {
      return this.send('TOGGLE_READY');
    }

    startGame() {
      if (!this.isHost || !this.currentRoom) return;

      const state = window.WorldForge.Core.GameState.createNewGame(this.myCountryId, {
        startMode: this.currentRoom.startMode || 'STABLE_START'
      });

      this.send('START_GAME', {
        initialState: state
      });
    }

    sendCommand(command) {
      if (!this.isMultiplayer) return false;
      const turn = window.WorldForge.Core.GameState ? window.WorldForge.Core.GameState.state.time.currentTurn : 1;
      return this.send('DISPATCH_COMMAND', { command, turn });
    }

    syncState(state, turn, report = null) {
      if (!this.isMultiplayer || !this.isHost) return;
      this.send('STATE_SYNC', { state, turn, report });
    }

    sendChat(text, channel = 'GLOBAL') {
      return this.send('SEND_CHAT', { text, channel });
    }

    handleServerMessage(msg) {
      switch (msg.type) {
        case 'PONG':
          break;

        case 'ROOM_LIST':
          this.emit('roomList', msg.rooms || []);
          break;

        case 'ROOM_CREATED': {
          this.currentRoom = msg.room;
          this.isHost = true;
          this.isMultiplayer = true;
          this.myCountryId = msg.assignedCountry || this.myCountryId;

          const req = this.pendingRequests.get('CREATE_ROOM');
          if (req) {
            clearTimeout(req.timeout);
            this.pendingRequests.delete('CREATE_ROOM');
            req.resolve(msg.room);
          }

          this.emit('roomCreated', msg.room);
          break;
        }

        case 'ROOM_JOINED': {
          this.currentRoom = msg.room;
          this.isHost = !!msg.isHost;
          this.isMultiplayer = true;
          if (msg.assignedCountry) this.myCountryId = msg.assignedCountry;

          const req = this.pendingRequests.get('JOIN_ROOM');
          if (req) {
            clearTimeout(req.timeout);
            this.pendingRequests.delete('JOIN_ROOM');
            req.resolve(msg.room);
          }

          this.emit('roomJoined', msg.room);
          break;
        }

        case 'RECONNECTED': {
          this.currentRoom = msg.room;
          this.isHost = !!msg.isHost;
          this.isMultiplayer = true;
          if (msg.assignedCountry) this.myCountryId = msg.assignedCountry;

          if (msg.state) {
            window.WorldForge.Core.GameState.state = msg.state;
            window.WorldForge.Core.GameState.state.playerCountryId = this.myCountryId;
          }

          this.emit('reconnected', { room: msg.room, myCountryId: this.myCountryId, isHost: this.isHost });
          break;
        }

        case 'PLAYER_JOINED':
        case 'LOBBY_UPDATE':
        case 'PLAYER_STATUS_CHANGE':
        case 'PLAYER_LEFT':
          this.currentRoom = msg.room;
          this.emit('lobbyUpdate', msg.room);
          break;

        case 'SELECT_COUNTRY_SUCCESS':
          this.myCountryId = msg.countryId;
          this.emit('countryChanged', msg.countryId);
          break;

        case 'GAME_STARTED': {
          this.currentRoom = msg.room;
          this.isMultiplayer = true;
          
          if (!this.isHost && msg.state) {
            window.WorldForge.Core.GameState.state = msg.state;
            window.WorldForge.Core.GameState.state.playerCountryId = this.myCountryId;
          }

          this.emit('gameStarted', { room: msg.room, myCountryId: this.myCountryId });
          break;
        }

        case 'COMMAND_BROADCAST':
          if (msg.command && window.WorldForge.Core.Commands) {
            const handler = window.WorldForge.Core.Commands.handlers.get(msg.command.type);
            const state = window.WorldForge.Core.GameState.getState();
            if (handler && state) {
              try {
                handler.execute(state, msg.command.payload, msg.command.countryId, msg.turn || 1);
                window.WorldForge.Core.Commands.emit('commandExecuted', {
                  type: msg.command.type,
                  countryId: msg.command.countryId,
                  payload: msg.command.payload
                });
              } catch (e) {
                console.error('[NetworkClient] Błąd wykonania odebranej komendy:', e);
              }
            }
          }
          this.emit('commandReceived', msg);
          break;

        case 'STATE_UPDATE':
          if (!this.isHost && msg.state) {
            window.WorldForge.Core.GameState.state = msg.state;
            window.WorldForge.Core.GameState.state.playerCountryId = this.myCountryId;
            window.WorldForge.UI.Navigation.updateTopBar();
            window.WorldForge.UI.App.renderActiveTab(window.WorldForge.UI.Navigation.activeTabId);
            if (msg.report) {
              window.WorldForge.UI.Reports.showTurnReportModal(msg.report);
            }
          }
          break;

        case 'CHAT_MESSAGE':
          this.emit('chatMessage', msg.message);
          break;

        case 'ERROR': {
          // Reject any pending request matching this error
          for (const [key, req] of this.pendingRequests.entries()) {
            clearTimeout(req.timeout);
            req.reject({ code: msg.code, message: msg.message });
            this.pendingRequests.delete(key);
          }
          this.emit('error', { code: msg.code, message: msg.message });
          break;
        }
      }
    }

    on(event, callback) {
      this.subscribers.push({ event, callback });
    }

    off(event, callback) {
      this.subscribers = this.subscribers.filter(s => !(s.event === event && (!callback || s.callback === callback)));
    }

    emit(event, data) {
      for (const sub of this.subscribers) {
        if (sub.event === event) {
          try {
            sub.callback(data);
          } catch (e) {
            console.error('[NetworkClient] Błąd subskrybenta:', e);
          }
        }
      }
    }
  }

  window.WorldForge.Core.NetworkClient = new NetworkClient();
  window.WorldForge.Network = window.WorldForge.Core.NetworkClient;
})();
