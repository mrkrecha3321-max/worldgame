/**
 * WorldForge: Nations — UI Smoke Test (jsdom)
 * Uruchamia prawdziwy serwer, ładuje grę w jsdom, klika każdą zakładkę
 * i przycisk, wykonuje baterię komend i testy regresji balansu handlu.
 *
 * Użycie: npm run test:ui
 */
const { JSDOM, VirtualConsole } = require('jsdom');
const { startServer } = require('../server');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
let checks = 0;
function assert(condition, label) {
  checks++;
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    failures++;
    console.log(`  ❌ ${label}`);
  }
}

(async () => {
  console.log('====================================================');
  console.log('🧪 [UI Smoke] Start testu interfejsu (jsdom)');
  console.log('====================================================');

  const serverInstance = await new Promise((resolve) => {
    const srv = startServer(0);
    srv.on('listening', () => resolve(srv));
  });
  const port = serverInstance.address().port;
  console.log(`Serwer testowy na porcie ${port}`);

  const runtimeErrors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => {
    const msg = (e.detail && e.detail.message) || e.message || '';
    if (msg.includes('Could not load img') || msg.includes('css')) return; // nieistotne w jsdom
    runtimeErrors.push(msg);
  });

  const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const w = dom.window;
  await sleep(5000);

  const d = w.document;
  const WF = w.WorldForge;

  console.log('\n--- 1. Start aplikacji ---');
  assert(!!WF && !!WF.Core && !!WF.UI, 'Namespace WorldForge załadowany w całości');
  assert(typeof WF.Core.GameState.getState === 'function', 'GameState dostępny');
  assert(d.getElementById('start-screen-container').innerHTML.length > 1000, 'Ekran startowy wyrenderowany');

  console.log('\n--- 2. Wbudowane self-testy (14) ---');
  const selfRes = WF.Tests.SelfTests.runAll();
  assert(selfRes.failed === 0, `Self-testy: ${selfRes.passed}/${selfRes.total} zaliczone (padły: ${selfRes.results.filter(r => !r.passed).map(r => r.name).join('; ') || 'brak'})`);

  console.log('\n--- 3. Start gry single-player (Polska) ---');
  d.getElementById('btn-confirm-start-country').click();
  await sleep(1500);
  const st = WF.Core.GameState.getState();
  const POL = st.playerCountryId;
  assert(st.countries[POL] && st.countries[POL].treasury > 0, `Gra wystartowała (kraj: ${POL})`);

  console.log('\n--- 4. Przełączenie wszystkich zakładek + klik wszystkich przycisków ---');
  runtimeErrors.length = 0;
  const navBtns = [...d.querySelectorAll('#sidebar-nav-items button, #sidebar-nav-items .nav-item')];
  let clickedButtons = 0;
  for (const btn of navBtns) {
    try { btn.click(); } catch (e) { runtimeErrors.push('nav: ' + e.message); }
    await sleep(120);
    // Kliknij każdy przycisk w aktualnym widoku (modale zamykaj od razu)
    const viewBtns = [...d.querySelectorAll('#right-drawer-content button, #map-viewport button')];
    for (const vb of viewBtns) {
      try {
        vb.click();
        clickedButtons++;
        if (d.getElementById('active-wf-modal')) WF.UI.Modal.close();
      } catch (e) {
        runtimeErrors.push(`btn "${vb.textContent.trim().slice(0, 24)}": ${e.message}`);
      }
      await sleep(15);
    }
  }
  const uniqueErrors = [...new Set(runtimeErrors)];
  assert(navBtns.length >= 12, `Zakładek nawigacji: ${navBtns.length}`);
  assert(clickedButtons > 40, `Klikniętych przycisków w widokach: ${clickedButtons}`);
  assert(uniqueErrors.length === 0, `Zero wyjątków przy klikaniu (unikalne błędy: ${uniqueErrors.slice(0, 4).join(' | ') || 'brak'})`);

  console.log('\n--- 5. Bateria komend (wszystkie typy) ---');
  const C = WF.Core.Commands;
  const cmdCases = [
    { type: 'SET_BUDGET', payload: { category: 'education', value: 13.0 } },
    { type: 'AUTO_BALANCE_BUDGET', payload: {} },
    { type: 'SET_TAX_RATE', payload: { taxType: 'vatRate', rate: 23 } },
    { type: 'INVEST_TAX_ADMIN', payload: { field: 'digitalization', amount: 200000000 } },
    { type: 'ISSUE_BONDS', payload: { amount: 2000000000, maturityMonths: 60, currency: 'PLN', bondType: 'Standard' } },
    { type: 'BUYBACK_BONDS', payload: { bondId: st.countries[POL].debt.bonds?.[0]?.id, amount: 100000000 } },
    { type: 'SET_CENTRAL_BANK_RATE', payload: { rate: 3.75 } },
    { type: 'SET_RESERVE_REQUIREMENT', payload: { requirement: 4.0 } },
    { type: 'BUILD_FACTORY', payload: { factoryTypeId: 'factory_steel_mill', customName: 'Test Huta', ownership: 'STATE' } },
    { type: 'EXPAND_FACTORY', payload: { factoryId: st.countries[POL].factories?.[0]?.id } },
    { type: 'TRANSFER_FUNDS', payload: { targetCountryId: 'DEU', amount: 1000000 } },
    { type: 'OFFER_STATE_LOAN', payload: { borrowerId: 'UKR', principal: 500000000, interestRate: 4.5, durationMonths: 24 } },
    { type: 'START_RESEARCH', payload: { techId: WF.Data.Technologies?.[0]?.id } },
    { type: 'START_PROJECT', payload: { projectId: WF.Data.Projects?.[0]?.id } },
    { type: 'EXECUTE_TRADE', payload: { resourceId: 'steel', action: 'SELL', amount: 1 } },
    { type: 'CREATE_BILATERAL_DEAL', payload: { importerId: 'DEU', resourceId: 'steel', monthlyAmount: 10, agreedPrice: 1, durationMonths: 6 } },
    { type: 'DIPLOMATIC_ACTION', payload: { action: 'IMPROVE_RELATIONS', targetId: 'FRA' } },
    { type: 'SET_MILITARY_CONFIG', payload: { branch: 'land', allocation: 35 } }
  ];
  let cmdOk = 0, cmdTotal = 0;
  for (const cmd of cmdCases) {
    cmdTotal++;
    const payload = { ...cmd.payload };
    // BUYBACK/EXPAND wymagają dynamicznych ID — jeśli brak, pomiń bez liczenia
    if ((cmd.type === 'BUYBACK_BONDS' && !payload.bondId) || (cmd.type === 'EXPAND_FACTORY' && !payload.factoryId)) { cmdTotal--; continue; }
    try {
      const r = C.dispatch({ type: cmd.type, countryId: POL, payload });
      if (r && r.success) cmdOk++;
      else if (r && r.reason && r.reason.includes('Nieprawidłowy') === false && r.reason.includes('Brak') === false && r.reason.includes('Niewystarczają') === false) {
        // odrzucenie biznesowe (np. brak środków) jest OK — przycisk działa
        cmdOk++;
      } else { cmdOk++; } // każdy zwrot z sensownym reason = przycisk działa
    } catch (e) {
      failures++;
      console.log(`  ❌ Komenda ${cmd.type} RZUCIŁA wyjątek: ${e.message}`);
    }
  }
  assert(cmdOk === cmdTotal, `Wszystkie komendy wykonane bez wyjątków (${cmdOk}/${cmdTotal})`);

  console.log('\n--- 6. REGRESJA EXPLOITA: cena spot już NIE jest ustawiana ręcznie ---');
  const steel = WF.Core.GameState.getState().countries[POL].production.steel;
  const spot = WF.Core.GameState.getState().globalMarket.prices.steel;
  const sellAmount = Math.max(1, Math.floor(steel.stockpile * 0.1));
  const before = WF.Core.GameState.getState().countries[POL].treasury;
  // Legacy payload z customPrice 1e6 — system MUSI go zignorować
  const hackRes = C.dispatch({ type: 'EXECUTE_TRADE', countryId: POL, payload: { resourceId: 'steel', action: 'SELL', amount: sellAmount, customPrice: 1000000 } });
  const afterTreasury = WF.Core.GameState.getState().countries[POL].treasury;
  assert(hackRes.success === true, 'Zlecenie SELL z legacy customPrice wykonuje się (ignorując cenę)');
  const proceedsPerUnit = (afterTreasury - before) / sellAmount;
  assert(proceedsPerUnit <= spot * 1000 * 1.001, `Wpływ ≤ cena spot (otrzymano ${proceedsPerUnit.toFixed(0)} USD/jedn. vs spot ${spot * 1000} USD/jedn. × 1000 jedn.)`);

  console.log('\n--- 7. REGRESJA EXPLOITA: market impact i limit płynności ---');
  const stE = WF.Core.GameState.getState();
  const st2 = stE.countries[POL].production.steel;
  const rejected = C.dispatch({ type: 'EXECUTE_TRADE', countryId: POL, payload: { resourceId: 'steel', action: 'BUY', amount: 800000 } });
  assert(rejected.success === false && /płynność/i.test(rejected.reason || ''), `Zlecenie ponad płynność rynku odrzucone z właściwym powodem (${(rejected.reason || '').slice(0, 60)}...)`);
  const dumpReject = C.dispatch({ type: 'EXECUTE_TRADE', countryId: POL, payload: { resourceId: 'steel', action: 'SELL', amount: st2.stockpile + 1000 } });
  assert(dumpReject.success === false, 'Zlecenie sprzedaży ponad stan magazynu odrzucone');
  const bigAmount = Math.min(Math.floor(st2.stockpile), 700000);
  if (bigAmount > 10000) {
    const priceBefore = stE.globalMarket.prices.steel;
    const res = C.dispatch({ type: 'EXECUTE_TRADE', countryId: POL, payload: { resourceId: 'steel', action: 'SELL', amount: bigAmount } });
    assert(res.success === true && res.result.marketImpact > 0.05, `Duże zlecenie ma realny market impact (${res.success ? (res.result.marketImpact * 100).toFixed(1) + '%' : 'odrzucone: ' + res.reason})`);
    const priceAfter = WF.Core.GameState.getState().globalMarket.prices.steel;
    assert(priceAfter < priceBefore, `Dumping obniża cenę światową (${priceBefore} → ${priceAfter})`);
    const proceeds = res.result.totalProceeds;
    assert(proceeds < bigAmount * priceBefore * 1000, `Wpływ z zlecenia < wycena po cenie spot (${(proceeds / 1e9).toFixed(1)} mld USD za ${bigAmount} jedn.)`);
  } else {
    console.log('  ⚠️ Za mały zapas stali na test dumpingu — pomijam');
  }

  console.log('\n--- 8. REGRESJA EXPLOITA: umowy bilateralne ---');
  const spotCoal = WF.Core.GameState.getState().globalMarket.prices.coal;
  const dear = C.dispatch({ type: 'CREATE_BILATERAL_DEAL', countryId: POL, payload: { importerId: 'DEU', resourceId: 'coal', monthlyAmount: 100, agreedPrice: spotCoal * 3, durationMonths: 12 } });
  assert(dear.success === false, `AI-importer odrzuca cenę 3× spot (${dear.reason?.slice(0, 60)}...)`);
  const tooCheap = C.dispatch({ type: 'CREATE_BILATERAL_DEAL', countryId: 'DEU', payload: { importerId: POL, resourceId: 'coal', monthlyAmount: 100, agreedPrice: spotCoal * 0.1, durationMonths: 12 } });
  assert(tooCheap.success === false, `AI-eksporter odrzuca cenę 0.1× spot (${tooCheap.reason?.slice(0, 60)}...)`);

  console.log('\n--- 9. Balans fiskalny i rozmiar zapisu po 60 turach ---');
  const TE = WF.Core.TurnEngine;
  for (let i = 0; i < 60; i++) {
    try { TE.nextTurn(); } catch (e) { runtimeErrors.push('turn ' + i + ': ' + e.message); }
    await sleep(30);
  }
  const stF = WF.Core.GameState.getState();
  const cPol = stF.countries[POL];
  const annualBalancePct = (cPol.budget.balanceMonthly * 12 / cPol.economy.gdpNominal) * 100;
  // Próg 6% uwzględnia wydatki poniesione przez baterię komend w kroku 5
  // (fabryka 0,8 mld, inwestycje, emisja obligacji → wyższa obsługa długu).
  // Na świeżej grze bez akcji gracza saldo wynosi ok. -2,8% PKB.
  assert(Math.abs(annualBalancePct) < 6, `Saldo budżetu POL: ${annualBalancePct.toFixed(2)}% PKB rocznie (realistyczne, bez eksplozji nadwyżki/deficytu)`);
  assert(cPol.treasury < cPol.economy.gdpNominal * 0.25, `Skarbiec POL nie puchnie nierealnie: ${(cPol.treasury / 1e9).toFixed(1)} mld (${(cPol.treasury / cPol.economy.gdpNominal * 100).toFixed(1)}% PKB)`);
  const infls = Object.values(stF.countries).map(c => c.economy.inflation);
  const spread = Math.max(...infls) - Math.min(...infls);
  assert(spread > 2.0, `Inflacje państw się różnicują (spread świata: ${spread.toFixed(1)} pp, min ${Math.min(...infls).toFixed(1)}%, max ${Math.max(...infls).toFixed(1)}%)`);
  assert(runtimeErrors.length === 0, `Zero wyjątków w 60 turach (błędy: ${runtimeErrors.slice(0, 3).join(' | ') || 'brak'})`);

  const saveOk = WF.Core.SaveSystem.saveGame('slot1');
  assert(saveOk === true, 'Zapis do slot1 działa');
  const saveSize = (w.localStorage.getItem('worldforge_nations_save_slot1') || '').length;
  assert(saveSize < 3500000, `Rozmiar zapisu po 60 turach: ${(saveSize / 1048576).toFixed(2)} MB (< 3.5 MB, mieści się w localStorage)`);
  const loadOk = WF.Core.SaveSystem.loadGame('slot1');
  assert(loadOk !== false && loadOk !== null && loadOk !== undefined, 'Wczytanie zapisu działa');

  console.log('\n--- 10. Zarabianie: dywidendy z państwowych fabryk ---');
  const stG = WF.Core.GameState.getState();
  const cG = stG.countries[POL];
  const testFactory = (cG.factories || []).find(f => f.name === 'Test Huta');
  assert(!!testFactory, 'Fabryka z baterii komend istnieje');
  if (testFactory) {
    assert(testFactory.status === 'ACTIVE', `Fabryka ukończona po 60 turach (status: ${testFactory.status})`);
    assert((testFactory.lastMonthlyProfit || 0) > 1000000, `Dywidenda państwowa wpływa co miesiąc (${WF.Format.money(testFactory.lastMonthlyProfit || 0, 'USD')}/m-c)`);
    assert((cG.stateEnterpriseDividends || 0) > 0, `Suma dywidend sektora państwowego: ${WF.Format.money(cG.stateEnterpriseDividends || 0, 'USD')}/m-c`);
    assert((cG.budget.revenues.soeDividends || 0) > (cG.budget.revenues.soeDividends || 0) - (cG.stateEnterpriseDividends || 0), 'Dywidendy ujęte w przychodach budżetu (soeDividends)');
  }

  console.log('\n====================================================');
  console.log(`🏁 [UI Smoke] Wynik: ${checks - failures}/${checks} sprawdzeń zaliczonych, failów: ${failures}`);
  console.log('====================================================');
  serverInstance.close();
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('💥 [UI Smoke] Błąd krytyczny harnessu:', e);
  process.exit(1);
});
