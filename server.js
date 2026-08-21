/**
 * WorldForge: Nations - Authoritative Multiplayer WebSocket & HTTP Server v2.1
 * Features:
 * - Room code normalization (handles WF-XXXX, XXXX, lowercase, spaces)
 * - Session-based authentication & 60s disconnect grace period
 * - Resilient host & player reconnects without room loss
 * - Heartbeat ping/pong for real dead socket detection
 * - Structured error codes (INVALID_ROOM_CODE, ROOM_NOT_FOUND, COUNTRY_TAKEN, etc.)
 * - Multi-port fallback (3000, 8080, 8000, 5000, 8888)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const DEFAULT_PORTS = [
  parseInt(process.env.PORT, 10) || 8080,
  3000,
  8000,
  5000,
  8888
].filter(Boolean);

const PUBLIC_DIR = __dirname;
// Okres ochronny po rozłączeniu (produkcja: 60 s; testy skracają przez MP_GRACE_MS)
const DISCONNECT_GRACE_PERIOD_MS = parseInt(process.env.MP_GRACE_MS, 10) || 60000;
const HEARTBEAT_INTERVAL_MS = 15000; // 15s ping/pong

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// Rooms and Session Store
const rooms = new Map(); // roomId -> RoomObject
const sessions = new Map(); // sessionToken -> { sessionToken, playerId, name, currentRoomId, lastSeen }

/**
 * Normalizes user input room codes to standard "WF-XXXX"
 * Handles: "WF-ABCD", "abcd", "  wf - abcd  ", "wfabcd", etc.
 */
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

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'WF-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastToRoom(room, messageObj, excludeClientId = null) {
  const data = JSON.stringify(messageObj);
  for (const p of room.players) {
    if (p.id !== excludeClientId && p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(data);
    }
  }
}

function sanitizeRoomForClient(room) {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    hostId: room.hostId,
    turnDuration: room.turnDuration,
    startMode: room.startMode,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      countryId: p.countryId,
      isHost: p.isHost,
      ready: p.ready,
      connected: p.connected,
      disconnectedAt: p.disconnectedAt
    }))
  };
}

function createHttpServer() {
  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        app: 'WorldForge: Nations Server',
        version: '2.1.0',
        activeRooms: rooms.size,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    if (req.url === '/api/rooms') {
      const publicRooms = [];
      for (const [id, r] of rooms.entries()) {
        const connectedCount = r.players.filter(p => p.connected).length;
        publicRooms.push({
          id: r.id,
          name: r.name,
          hasPassword: !!r.password,
          status: r.status,
          playerCount: r.players.length,
          connectedCount,
          maxPlayers: r.maxPlayers || 32,
          hostName: r.players.find(p => p.id === r.hostId)?.name || 'Host',
          turnDuration: r.turnDuration
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ rooms: publicRooms }));
      return;
    }

    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
    });
  });
}

function handleClientMessage(ws, msg) {
  const sessionToken = (msg.sessionToken || ws.sessionToken || 'sess_' + Date.now()).toString();
  ws.sessionToken = sessionToken;

  switch (msg.type) {
    case 'PING': {
      ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      break;
    }

    case 'LIST_ROOMS': {
      const roomList = [];
      for (const [id, r] of rooms.entries()) {
        roomList.push({
          id: r.id,
          name: r.name,
          hasPassword: !!r.password,
          status: r.status,
          playerCount: r.players.length,
          connectedCount: r.players.filter(p => p.connected).length,
          maxPlayers: r.maxPlayers || 32,
          hostName: r.players.find(p => p.id === r.hostId)?.name || 'Host',
          turnDuration: r.turnDuration
        });
      }
      ws.send(JSON.stringify({ type: 'ROOM_LIST', rooms: roomList }));
      break;
    }

    case 'CREATE_ROOM': {
      const roomId = generateRoomCode();
      const playerName = (msg.playerName || 'Gracz 1').trim().slice(0, 24);
      const countryId = (msg.countryId || 'POL').toUpperCase();

      const newRoom = {
        id: roomId,
        name: msg.roomName || `Pokój ${roomId}`,
        password: msg.password || null,
        hostId: ws.clientId,
        status: 'LOBBY',
        turnDuration: msg.turnDuration || 180,
        startMode: msg.startMode || 'STABLE_START',
        maxPlayers: 32,
        players: [{
          id: ws.clientId,
          sessionToken: sessionToken,
          name: playerName,
          countryId: countryId,
          isHost: true,
          ready: true,
          connected: true,
          disconnectedAt: null,
          disconnectTimer: null,
          ws: ws
        }],
        state: null,
        chatHistory: []
      };

      rooms.set(roomId, newRoom);
      ws.currentRoomId = roomId;

      sessions.set(sessionToken, {
        sessionToken,
        playerId: ws.clientId,
        name: playerName,
        currentRoomId: roomId,
        lastSeen: Date.now()
      });

      ws.send(JSON.stringify({
        type: 'ROOM_CREATED',
        room: sanitizeRoomForClient(newRoom),
        clientId: ws.clientId,
        sessionToken: sessionToken,
        assignedCountry: countryId
      }));
      console.log(`[Multiplayer] Pokój ${roomId} utworzony przez ${playerName} (${countryId}) [sesja: ${sessionToken}]`);
      break;
    }

    case 'JOIN_ROOM': {
      const rawCode = msg.roomId || '';
      const roomId = normalizeRoomCode(rawCode);

      if (!roomId) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'INVALID_ROOM_CODE',
          message: 'Nieprawidłowy format kodu pokoju. Kod powinien mieć postać np. WF-ABCD lub ABCD.'
        }));
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'ROOM_NOT_FOUND',
          message: `Nie znaleziono aktywnego pokoju o kodzie ${roomId}. Upewnij się, że host założył pokój.`
        }));
        return;
      }

      if (room.password && room.password !== msg.password) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'INVALID_PASSWORD',
          message: 'Podane hasło do pokoju jest nieprawidłowe.'
        }));
        return;
      }

      // Check if player is reconnecting with existing sessionToken in this room
      const existingPlayer = room.players.find(p => p.sessionToken === sessionToken);
      if (existingPlayer) {
        if (existingPlayer.disconnectTimer) {
          clearTimeout(existingPlayer.disconnectTimer);
          existingPlayer.disconnectTimer = null;
        }
        existingPlayer.ws = ws;
        existingPlayer.id = ws.clientId;
        existingPlayer.connected = true;
        existingPlayer.disconnectedAt = null;
        ws.currentRoomId = roomId;

        console.log(`[Multiplayer] Gracz ${existingPlayer.name} (${existingPlayer.countryId}) pomyślnie powrócił do pokoju ${roomId}!`);

        ws.send(JSON.stringify({
          type: room.status === 'PLAYING' ? 'RECONNECTED' : 'ROOM_JOINED',
          room: sanitizeRoomForClient(room),
          state: room.state,
          clientId: ws.clientId,
          sessionToken: sessionToken,
          assignedCountry: existingPlayer.countryId,
          isHost: existingPlayer.isHost
        }));

        broadcastToRoom(room, {
          type: 'LOBBY_UPDATE',
          room: sanitizeRoomForClient(room)
        }, ws.clientId);
        return;
      }

      if (room.status === 'PLAYING') {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'GAME_ALREADY_STARTED',
          message: 'Rozgrywka w tym pokoju już wystartowała. Nie można dołączyć jako nowy gracz.'
        }));
        return;
      }

      if (room.players.length >= (room.maxPlayers || 32)) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'ROOM_FULL',
          message: 'Pokój osiągnął maksymalny limit graczy (32).'
        }));
        return;
      }

      const playerName = (msg.playerName || `Gracz ${room.players.length + 1}`).trim().slice(0, 24);
      
      // Determine country: if preferred country requested and free, assign it; otherwise find first available
      let chosenCountry = (msg.countryId || 'DEU').toUpperCase();
      const takenCountries = room.players.map(p => p.countryId);
      
      if (takenCountries.includes(chosenCountry)) {
        const fallbacks = ['DEU', 'FRA', 'GBR', 'USA', 'JPN', 'CHN', 'ITA', 'ESP', 'CAN', 'BRA', 'IND', 'KOR', 'AUS', 'SWE', 'NOR', 'CHE', 'TUR', 'SAU', 'EGY', 'MEX', 'ARG'];
        chosenCountry = fallbacks.find(f => !takenCountries.includes(f)) || 'NLD';
      }

      const playerObj = {
        id: ws.clientId,
        sessionToken: sessionToken,
        name: playerName,
        countryId: chosenCountry,
        isHost: false,
        ready: false,
        connected: true,
        disconnectedAt: null,
        disconnectTimer: null,
        ws: ws
      };

      room.players.push(playerObj);
      ws.currentRoomId = roomId;

      sessions.set(sessionToken, {
        sessionToken,
        playerId: ws.clientId,
        name: playerName,
        currentRoomId: roomId,
        lastSeen: Date.now()
      });

      ws.send(JSON.stringify({
        type: 'ROOM_JOINED',
        room: sanitizeRoomForClient(room),
        clientId: ws.clientId,
        sessionToken: sessionToken,
        assignedCountry: chosenCountry
      }));

      broadcastToRoom(room, {
        type: 'PLAYER_JOINED',
        player: { id: playerObj.id, name: playerObj.name, countryId: playerObj.countryId, ready: playerObj.ready, isHost: false, connected: true },
        room: sanitizeRoomForClient(room)
      }, ws.clientId);

      console.log(`[Multiplayer] ${playerName} dołączył do pokoju ${roomId} jako ${chosenCountry}`);
      break;
    }

    case 'RECONNECT_SESSION': {
      const token = msg.sessionToken;
      if (!token) return;

      const sess = sessions.get(token);
      if (sess && sess.currentRoomId) {
        const room = rooms.get(sess.currentRoomId);
        if (room) {
          const player = room.players.find(p => p.sessionToken === token);
          if (player) {
            if (player.disconnectTimer) {
              clearTimeout(player.disconnectTimer);
              player.disconnectTimer = null;
            }
            player.ws = ws;
            player.id = ws.clientId;
            player.connected = true;
            player.disconnectedAt = null;
            ws.currentRoomId = room.id;
            ws.sessionToken = token;

            ws.send(JSON.stringify({
              type: room.status === 'PLAYING' ? 'RECONNECTED' : 'ROOM_JOINED',
              room: sanitizeRoomForClient(room),
              state: room.state,
              clientId: ws.clientId,
              sessionToken: token,
              assignedCountry: player.countryId,
              isHost: player.isHost
            }));

            broadcastToRoom(room, {
              type: 'LOBBY_UPDATE',
              room: sanitizeRoomForClient(room)
            }, ws.clientId);
            return;
          }
        }
      }

      ws.send(JSON.stringify({
        type: 'SESSION_EXPIRED',
        message: 'Poprzednia sesja wygasła lub pokój został zamknięty.'
      }));
      break;
    }

    case 'SELECT_COUNTRY': {
      const room = rooms.get(ws.currentRoomId);
      if (!room || room.status !== 'LOBBY') return;

      const player = room.players.find(p => p.id === ws.clientId);
      if (!player) return;

      const targetCountry = (msg.countryId || '').toUpperCase();
      const isTaken = room.players.some(p => p.id !== ws.clientId && p.countryId === targetCountry);

      if (isTaken) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'COUNTRY_TAKEN',
          message: `Państwo ${targetCountry} jest już wybrane przez innego gracza. Wybierz inne wolne państwo.`
        }));
        return;
      }

      player.countryId = targetCountry;
      
      ws.send(JSON.stringify({
        type: 'SELECT_COUNTRY_SUCCESS',
        countryId: targetCountry
      }));

      broadcastToRoom(room, {
        type: 'LOBBY_UPDATE',
        room: sanitizeRoomForClient(room)
      });
      break;
    }

    case 'TOGGLE_READY': {
      const room = rooms.get(ws.currentRoomId);
      if (!room || room.status !== 'LOBBY') return;

      const player = room.players.find(p => p.id === ws.clientId);
      if (!player) return;

      player.ready = !player.ready;
      broadcastToRoom(room, {
        type: 'LOBBY_UPDATE',
        room: sanitizeRoomForClient(room)
      });
      break;
    }

    case 'START_GAME': {
      const room = rooms.get(ws.currentRoomId);
      if (!room || room.status !== 'LOBBY') return;

      const player = room.players.find(p => p.id === ws.clientId);
      if (!player || !player.isHost) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'NOT_HOST',
          message: 'Tylko gospodarz (Host) może uruchomić rozgrywkę.'
        }));
        return;
      }

      // Validation: all players connected?
      const disconnectedPlayers = room.players.filter(p => !p.connected);
      if (disconnectedPlayers.length > 0) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'PLAYER_DISCONNECTED',
          message: `Nie można wystartować: gracz ${disconnectedPlayers[0].name} jest rozłączony.`
        }));
        return;
      }

      // Validation: all non-hosts ready?
      const unreadyPlayers = room.players.filter(p => !p.isHost && !p.ready);
      if (unreadyPlayers.length > 0) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'NOT_ALL_READY',
          message: `Oczekiwanie na gotowość graczy: ${unreadyPlayers.map(p => p.name).join(', ')}.`
        }));
        return;
      }

      // Validation: unique countries
      const countrySet = new Set();
      for (const p of room.players) {
        if (countrySet.has(p.countryId)) {
          ws.send(JSON.stringify({
            type: 'ERROR',
            code: 'COUNTRY_CONFLICT',
            message: `Konflikt: dwóch graczy wybrało państwo ${p.countryId}. Każdy gracz musi sterować innym państwem.`
          }));
          return;
        }
        countrySet.add(p.countryId);
      }

      room.status = 'PLAYING';
      room.state = msg.initialState || null;

      broadcastToRoom(room, {
        type: 'GAME_STARTED',
        room: sanitizeRoomForClient(room),
        state: room.state
      });

      console.log(`[Multiplayer] Rozgrywka w pokoju ${room.id} wystartowała z ${room.players.length} graczami!`);
      break;
    }

    case 'DISPATCH_COMMAND': {
      const room = rooms.get(ws.currentRoomId);
      if (!room || room.status !== 'PLAYING') return;

      const command = msg.command;
      const player = room.players.find(p => p.id === ws.clientId);

      if (!player || !command) return;

      // Validate country control authority
      if (command.countryId !== player.countryId && !player.isHost) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          code: 'UNAUTHORIZED_COUNTRY',
          message: 'Brak uprawnień do wydawania rozkazów dla obcego państwa.'
        }));
        return;
      }

      broadcastToRoom(room, {
        type: 'COMMAND_BROADCAST',
        command: command,
        senderCountryId: player.countryId,
        senderName: player.name,
        turn: msg.turn || 1
      });
      break;
    }

    case 'STATE_SYNC': {
      const room = rooms.get(ws.currentRoomId);
      if (!room || room.status !== 'PLAYING') return;

      const player = room.players.find(p => p.id === ws.clientId);
      if (player && player.isHost && msg.state) {
        room.state = msg.state;
        broadcastToRoom(room, {
          type: 'STATE_UPDATE',
          state: room.state,
          turn: msg.turn,
          report: msg.report || null
        }, ws.clientId);
      }
      break;
    }

    case 'SEND_CHAT': {
      const room = rooms.get(ws.currentRoomId);
      if (!room) return;

      const player = room.players.find(p => p.id === ws.clientId);
      if (!player) return;

      const chatRecord = {
        id: 'chat_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        senderId: player.id,
        senderName: player.name,
        senderCountry: player.countryId,
        channel: msg.channel || 'GLOBAL',
        text: (msg.text || '').trim().slice(0, 300),
        timestamp: Date.now()
      };

      room.chatHistory.push(chatRecord);
      if (room.chatHistory.length > 200) room.chatHistory.shift();

      broadcastToRoom(room, {
        type: 'CHAT_MESSAGE',
        message: chatRecord
      });
      break;
    }
  }
}

function handleClientDisconnect(ws) {
  if (!ws.currentRoomId) return;
  const room = rooms.get(ws.currentRoomId);
  if (!room) return;

  const player = room.players.find(p => p.id === ws.clientId || p.sessionToken === ws.sessionToken);
  if (!player) return;

  player.connected = false;
  player.disconnectedAt = Date.now();
  player.ws = null;

  console.log(`[Multiplayer] Gracz ${player.name} (${player.countryId}) rozłączył się z pokoju ${room.id}. Rozpoczynam 60s okres ochronny.`);

  broadcastToRoom(room, {
    type: 'PLAYER_STATUS_CHANGE',
    playerId: player.id,
    playerName: player.name,
    countryId: player.countryId,
    connected: false,
    room: sanitizeRoomForClient(room)
  });

  // Start 60-second grace period timer
  if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
  player.disconnectTimer = setTimeout(() => {
    // If still not connected after 60s
    if (!player.connected) {
      console.log(`[Multiplayer] Okres ochronny (60s) minął dla ${player.name} w pokoju ${room.id}.`);
      
      const idx = room.players.findIndex(p => p.sessionToken === player.sessionToken);
      if (idx !== -1) {
        room.players.splice(idx, 1);
      }

      // If room is empty, delete room cleanly
      if (room.players.length === 0) {
        rooms.delete(room.id);
        console.log(`[Multiplayer] Pokój ${room.id} został usunięty (brak aktywnych graczy).`);
      } else {
        // Transfer host role if needed
        if (room.hostId === player.id) {
          const nextPlayer = room.players.find(p => p.connected) || room.players[0];
          room.hostId = nextPlayer.id;
          nextPlayer.isHost = true;
        }

        broadcastToRoom(room, {
          type: 'PLAYER_LEFT',
          playerId: player.id,
          playerName: player.name,
          room: sanitizeRoomForClient(room)
        });
      }
    }
  }, DISCONNECT_GRACE_PERIOD_MS);
}

// Multi-port startup with automatic fallback.
// Zwraca "handle" delegujący do faktycznie nasłuchującego serwera — dzięki temu
// `listening`/`address()`/`close()` działają poprawnie również wtedy, gdy
// kolejne porty były zajęte i serwer musiał przełączyć się na kolejny.
function startServer(portIndex = 0) {
  if (portIndex >= DEFAULT_PORTS.length) {
    console.error('❌ [BŁĄD] Nie udało się powiązać z żadnym standardowym portem (8080, 3000, 8000, 5000, 8888).');
    process.exit(1);
    return null;
  }

  let activeServer = null;
  const pendingListeners = {}; // eventName -> [fn]

  const startListening = (appServer, tryPort) => {
    const wss = new WebSocketServer({ server: appServer });

    // Periodic Heartbeat Ping/Pong
    const heartbeatInterval = setInterval(() => {
      wss.clients.forEach((client) => {
        if (client.isAlive === false) {
          console.log(`[Heartbeat] Klient ${client.clientId} nie odpowiedział na PING. Zamykam połączenie.`);
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, HEARTBEAT_INTERVAL_MS);

    wss.on('close', () => {
      clearInterval(heartbeatInterval);
    });

    wss.on('connection', (ws) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      const clientId = 'client_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      ws.clientId = clientId;
      ws.currentRoomId = null;

      ws.send(JSON.stringify({
        type: 'CONNECTED',
        clientId: clientId,
        serverVersion: '2.1.0'
      }));

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          handleClientMessage(ws, msg);
        } catch (e) {
          console.error('[Server WS] Błąd parsowania JSON:', e);
        }
      });

      ws.on('close', () => {
        handleClientDisconnect(ws);
      });
    });

    console.log(`=======================================================`);
    console.log(`🌍 WorldForge: Nations - Serwer Gry & Multiplayer v2.1`);
    console.log(`📡 Serwer działa na porcie: ${tryPort}`);
    console.log(`🔗 Otwórz w przeglądarce: http://localhost:${tryPort}`);
    console.log(`☁️  Udostępnij koledze przez Cloudflare Tunnel:`);
    console.log(`   npx cloudflared tunnel --url http://localhost:${tryPort}`);
    console.log(`=======================================================`);
  };

  const attempt = (idx) => {
    if (idx >= DEFAULT_PORTS.length) {
      console.error('❌ [BŁĄD] Nie udało się powiązać z żadnym standardowym portem (8080, 3000, 8000, 5000, 8888).');
      process.exit(1);
      return;
    }

    const tryPort = DEFAULT_PORTS[idx];
    const appServer = createHttpServer();

    appServer.on('error', (err) => {
      if (err.code === 'EACCES' || err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${tryPort} jest zablokowany (${err.code}). Przełączam na kolejny port...`);
        appServer.close();
        attempt(idx + 1);
      } else {
        console.error('Błąd serwera:', err);
      }
    });

    appServer.listen(tryPort, '0.0.0.0', () => {
      activeServer = appServer;
      startListening(appServer, tryPort);
      (pendingListeners.listening || []).forEach((fn) => fn());
    });
  };

  attempt(portIndex);

  // Delegujący handle zgodny z API net.Server używanym przez testy
  const handle = {
    on(event, fn) {
      if (event === 'listening' && activeServer) fn();
      else (pendingListeners[event] = pendingListeners[event] || []).push(fn);
      return handle;
    },
    close(cb) {
      if (activeServer) activeServer.close(cb);
      else if (typeof cb === 'function') cb();
      return handle;
    },
    address() {
      return activeServer ? activeServer.address() : null;
    },
    get server() {
      return activeServer;
    }
  };

  return handle;
}

if (require.main === module) {
  startServer(0);
}

module.exports = {
  createHttpServer,
  startServer,
  normalizeRoomCode,
  rooms,
  sessions,
  DISCONNECT_GRACE_PERIOD_MS
};
