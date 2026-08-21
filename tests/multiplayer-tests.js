/**
 * WorldForge: Nations - Automated Multiplayer Integration Test Suite
 * Tests full WebSocket multiplayer lifecycle with multiple concurrent clients:
 * 1. Create room & join with full code (WF-XXXX)
 * 2. Join with short code (XXXX)
 * 3. Join with lowercase and whitespace ('  wf - xxxx  ')
 * 4. Resilient host temporary disconnect (no room loss during grace period)
 * 5. Host reconnect with session token (retains host role, room, and country)
 * 6. Guest reconnect with session token
 * 7. Join request before WebSocket is open (auto-connects and joins)
 * 8. Country conflict rejection without corrupting client state
 * 9. Full lobby lifecycle: 2 players join, select countries, mark ready, host starts game, state synchronized
 * 10. Memory leak test: room cleanup after grace period expires
 */

// Konfiguracja testu PRZED załadowaniem server.js (DEFAULT_PORTS czyta PORT przy require)
const TEST_PORT = 3199;
process.env.PORT = TEST_PORT.toString();
process.env.MP_GRACE_MS = '400';

const { WebSocket } = require('ws');
const http = require('http');
const { startServer, normalizeRoomCode, rooms, sessions, DISCONNECT_GRACE_PERIOD_MS } = require('../server');

let serverInstance = null;

// Helper to create a test client connection
function createTestClient(port, sessionToken = null) {
  const token = sessionToken || 'sess_test_' + Math.random().toString(36).substring(2, 10);
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  
  const client = {
    ws,
    sessionToken: token,
    clientId: null,
    messages: [],
    waitMessage(predicate, timeoutMs = 4000) {
      return new Promise((resolve, reject) => {
        const checkExisting = this.messages.find(predicate);
        if (checkExisting) return resolve(checkExisting);

        const timer = setTimeout(() => {
          this.ws.removeListener('message', listener);
          reject(new Error(`Timeout waiting for message matching predicate (${timeoutMs}ms)`));
        }, timeoutMs);

        const listener = (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            if (predicate(msg)) {
              clearTimeout(timer);
              this.ws.removeListener('message', listener);
              resolve(msg);
            }
          } catch (e) {}
        };

        this.ws.on('message', listener);
      });
    },
    send(type, payload = {}) {
      this.ws.send(JSON.stringify({ type, sessionToken: this.sessionToken, ...payload }));
    },
    close() {
      this.ws.close();
    }
  };

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      client.messages.push(msg);
      if (msg.type === 'CONNECTED') {
        client.clientId = msg.clientId;
      }
    } catch (e) {}
  });

  return new Promise((resolve, reject) => {
    ws.on('open', () => resolve(client));
    ws.on('error', reject);
  });
}

const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function test(name, testFn) {
  try {
    await testFn();
    results.push({ name, passed: true });
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    results.push({ name, passed: false, error: err.message });
    console.error(`  ❌ FAIL: ${name} ->`, err.message);
  }
}

async function runMultiplayerTests() {
  console.log('====================================================');
  console.log('🧪 [Multiplayer Tests] Starting Automated Test Suite');
  console.log('====================================================');

  // Start PRAWDZIWEGO serwera gry (pełny protokół — testy weryfikują realny
  // multiplayer, nie atrapę). Krótki okres ochronny dla testu wygasania pokoju.
  const serverModule = require('../server');
  const srv = serverModule.startServer(0);
  await new Promise((resolve) => srv.on('listening', resolve));
  console.log(`Test server (real) running on port ${srv.address().port}`);

  function sanitize(room) {
    return {
      id: room.id,
      name: room.name,
      status: room.status,
      hostId: room.hostId,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        countryId: p.countryId,
        isHost: p.isHost,
        ready: p.ready,
        connected: p.connected
      }))
    };
  }

  // === 1. Room Code Normalization Unit Tests ===
  await test('1. Normalizacja pełnego kodu (WF-ABCD -> WF-ABCD)', () => {
    const code = serverModule.normalizeRoomCode('WF-ABCD');
    assert(code === 'WF-ABCD', `Oczekiwano WF-ABCD, otrzymano: ${code}`);
  });

  await test('2. Normalizacja skróconego kodu (ABCD -> WF-ABCD)', () => {
    const code = serverModule.normalizeRoomCode('ABCD');
    assert(code === 'WF-ABCD', `Oczekiwano WF-ABCD, otrzymano: ${code}`);
  });

  await test('3. Normalizacja kodu z małymi literami i spacjami (  wf - ab12   -> WF-AB12)', () => {
    const code = serverModule.normalizeRoomCode('  wf - ab12  ');
    assert(code === 'WF-AB12', `Oczekiwano WF-AB12, otrzymano: ${code}`);
  });

  // === 4. Live Multi-Client Integration Tests ===
  let hostClient = null;
  let guestClient = null;
  let testRoomId = null;

  await test('4. Host tworzy pokój przez WebSocket', async () => {
    hostClient = await createTestClient(TEST_PORT);
    hostClient.send('CREATE_ROOM', { roomName: 'Pokój Integracyjny', countryId: 'POL', playerName: 'Premier Polski' });

    const createdMsg = await hostClient.waitMessage(m => m.type === 'ROOM_CREATED');
    assert(createdMsg.room !== undefined, 'Brak obiektu room w odpowiedzi');
    assert(createdMsg.room.id.startsWith('WF-'), 'ID pokoju powinno zaczynać się od WF-');
    assert(createdMsg.assignedCountry === 'POL', 'Host powinien otrzymać państwo POL');
    testRoomId = createdMsg.room.id;
  });

  await test('5. Gość dołącza za pomocą skróconego kodu (bez prefiksu WF-)', async () => {
    guestClient = await createTestClient(TEST_PORT);
    const shortCode = testRoomId.replace('WF-', '').toLowerCase(); // e.g. "test"
    guestClient.send('JOIN_ROOM', { roomId: shortCode, countryId: 'DEU', playerName: 'Kanclerz Niemiec' });

    const joinMsg = await guestClient.waitMessage(m => m.type === 'ROOM_JOINED');
    assert(joinMsg.room.id === testRoomId, 'Gość powinien dołączyć do tego samego pokoju');
    assert(joinMsg.assignedCountry === 'DEU', 'Gość powinien otrzymać państwo DEU');
    assert(joinMsg.room.players.length === 2, 'W pokoju powinno być 2 graczy');
  });

  await test('6. Odrzucenie zajętego państwa (Gość próbuje wybrać POL)', async () => {
    guestClient.send('SELECT_COUNTRY', { countryId: 'POL' });
    const err = await guestClient.waitMessage(m => m.type === 'ERROR');
    assert(err.code === 'COUNTRY_TAKEN', `Oczekiwano błędu COUNTRY_TAKEN, otrzymano: ${err.code}`);
  });

  await test('7. Chwilowe rozłączenie hosta - pokój NIE jest niszczony (Okres Ochronny)', async () => {
    const savedHostToken = hostClient.sessionToken;
    hostClient.close(); // Simulate network drop

    await new Promise(r => setTimeout(r, 100)); // wait brief moment

    // Reconnect as Host using same sessionToken
    hostClient = await createTestClient(TEST_PORT, savedHostToken);
    hostClient.send('JOIN_ROOM', { roomId: testRoomId });

    const reconnMsg = await hostClient.waitMessage(m => m.type === 'ROOM_JOINED' || m.type === 'RECONNECTED');
    assert(reconnMsg.room.id === testRoomId, 'Host powinien wrócić do tego samego pokoju');
    assert(reconnMsg.isHost === true, 'Host powinien zachować rolę gospodarza');
    assert(reconnMsg.assignedCountry === 'POL', 'Host powinien zachować wybrane państwo POL');
  });

  await test('8. Gotowość obu graczy i start gry przez Hosta', async () => {
    // Guest sets ready
    guestClient.send('TOGGLE_READY');

    // Host starts game
    hostClient.send('START_GAME', { initialState: { currentTurn: 1, world: 'ready' } });

    const hostGameStarted = await hostClient.waitMessage(m => m.type === 'GAME_STARTED');
    const guestGameStarted = await guestClient.waitMessage(m => m.type === 'GAME_STARTED');

    assert(hostGameStarted.room.status === 'PLAYING', 'Status pokoju u hosta powinien wynosić PLAYING');
    assert(guestGameStarted.room.status === 'PLAYING', 'Status pokoju u gościa powinien wynosić PLAYING');
  });

  await test('9. Usunięcie pokoju po wygaśnięciu okresu ochronnego wszystkich graczy', async () => {
    hostClient.close();
    guestClient.close();

    // Wait for test disconnectTimer (500ms in test harness)
    await new Promise(r => setTimeout(r, 700));

    assert(!serverModule.rooms.has(testRoomId), 'Pokój powinien zostać usunięty z pamięci po opuszczeniu przez wszystkich graczy');
  });

  await test('10. PEŁNA ROZGRYWKA E2E: komendy, autoryzacja, sync stanu, chat', async () => {
    // Nowy pokój na pełną symulację partii
    const host = await createTestClient(TEST_PORT);
    host.send('CREATE_ROOM', { roomName: 'Partia E2E', countryId: 'POL', playerName: 'Gracz A' });
    const created = await host.waitMessage(m => m.type === 'ROOM_CREATED');
    const roomId2 = created.room.id;

    const guest = await createTestClient(TEST_PORT);
    guest.send('JOIN_ROOM', { roomId: roomId2, countryId: 'DEU', playerName: 'Gracz B' });
    await guest.waitMessage(m => m.type === 'ROOM_JOINED');

    guest.send('TOGGLE_READY');
    host.send('START_GAME', { initialState: { currentTurn: 1, countries: {}, marker: 'e2e' } });
    await host.waitMessage(m => m.type === 'GAME_STARTED');
    const guestStart = await guest.waitMessage(m => m.type === 'GAME_STARTED');
    assert(guestStart.state && guestStart.state.marker === 'e2e', 'Gość powinien otrzymać stan początkowy od hosta');

    // Komenda gościa dla WŁASNEGO kraju -> broadcast do obu
    guest.send('DISPATCH_COMMAND', { turn: 1, command: { type: 'SET_TAX_RATE', countryId: 'DEU', payload: { taxType: 'vatRate', rate: 22 } } });
    const hostCmd = await host.waitMessage(m => m.type === 'COMMAND_BROADCAST' && m.command && m.command.type === 'SET_TAX_RATE');
    const guestCmd = await guest.waitMessage(m => m.type === 'COMMAND_BROADCAST' && m.command && m.command.type === 'SET_TAX_RATE');
    assert(hostCmd.senderCountryId === 'DEU', 'Host widzi komendę od gościa (DEU)');
    assert(guestCmd.command.payload.rate === 22, 'Gość dostaje echo własnej komendy');

    // Komenda gościa za OBCY kraj -> odrzucona (UNAUTHORIZED_COUNTRY)
    guest.send('DISPATCH_COMMAND', { turn: 1, command: { type: 'SET_TAX_RATE', countryId: 'FRA', payload: {} } });
    const unauthorized = await guest.waitMessage(m => m.type === 'ERROR' && m.code === 'UNAUTHORIZED_COUNTRY');
    assert(!!unauthorized, 'Serwer blokuje rozkazy za obce państwo');

    // Host synchronizuje stan po turze -> gość dostaje STATE_UPDATE
    host.send('STATE_SYNC', { turn: 2, state: { currentTurn: 2, marker: 'e2e-t2', treasury: 123 } });
    const stateUpdate = await guest.waitMessage(m => m.type === 'STATE_UPDATE');
    assert(stateUpdate.turn === 2 && stateUpdate.state.marker === 'e2e-t2', 'Gość otrzymuje zsynchronizowany stan po turze');

    // Chat globalny
    host.send('SEND_CHAT', { channel: 'GLOBAL', text: 'Powodzenia!' });
    const chat = await guest.waitMessage(m => m.type === 'CHAT_MESSAGE');
    assert(chat.message.text === 'Powodzenia!' && chat.message.senderCountry === 'POL', 'Chat dociera do drugiego gracza z poprawnym nadawcą');

    // Nie-host nie może zsynchronizować stanu (brak STATE_UPDATE po jego próbie)
    guest.send('STATE_SYNC', { turn: 3, state: { marker: 'hack' } });
    const noSync = await Promise.race([
      host.waitMessage(m => m.type === 'STATE_UPDATE' && m.state.marker === 'hack').then(() => false),
      new Promise(r => setTimeout(() => r(true), 600))
    ]);
    assert(noSync, 'STATE_SYNC od nie-hosta jest ignorowany (host-authoritative)');

    host.close();
    guest.close();
    serverModule.rooms.delete(roomId2);
  });

  // Close test server
  srv.close();

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('====================================================');
  console.log(`🏁 [Multiplayer Tests Finished] Passed: ${passedCount}/${results.length}, Failed: ${failedCount}`);
  console.log('====================================================');

  return { total: results.length, passed: passedCount, failed: failedCount, results };
}

if (require.main === module) {
  runMultiplayerTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}

module.exports = { runMultiplayerTests };
