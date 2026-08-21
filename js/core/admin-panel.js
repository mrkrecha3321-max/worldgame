/**
 * WorldForge: Nations — UKRYTY panel administratora (sandbox hosta)
 *
 * Odblokowanie WYŁĄCZNIE przez sekretne URL:  ?admin=arena2026
 * (klucz zmienisz poniżej w ADMIN_KEY — nie podawaj go kolegom, a link
 * z parametrem otwieraj tylko u siebie; bez parametru moduł jest niewidoczny
 * i nie pozostawia żadnego śladu w interfejsie).
 *
 * Możliwości: szoki cenowe dowolnego aktywa (np. złoto +150% / -99%),
 * reset do wartości fundamentalnej, krach wszystkiego, dosypywanie
 * skarbca i złota do własnego kraju (sandbox/testy balansu).
 */
(function () {
  'use strict';

  const ADMIN_KEY = 'arena2026'; // ← zmień na swój własny sekret

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  const AdminPanel = {
    unlocked: false,
    panelEl: null,

    unlock(key) {
      if (key === ADMIN_KEY) {
        this.unlocked = true;
        try { sessionStorage.setItem('wf_admin', '1'); } catch (e) { /* prywatny tryb */ }
        return true;
      }
      return false;
    },

    lock() {
      this.unlocked = false;
      try { sessionStorage.removeItem('wf_admin'); } catch (e) {}
      this.hidePanel();
    },

    isUnlocked() {
      return this.unlocked;
    },

    _market() {
      return window.WorldForge.Core.GameState.getExchangeMarket();
    },

    _findAsset(assetId) {
      const market = this._market();
      const comm = (market.commodities || []).find(c => c.id === assetId);
      if (comm) return { kind: 'commodity', item: comm };
      const stock = (market.stocks || []).find(s => s.ticker === assetId || s.id === assetId);
      if (stock) return { kind: 'stock', item: stock };
      return null;
    },

    _priceKey(item) {
      return (item.currentPrice !== undefined) ? 'currentPrice' : 'sharePrice';
    },

    /**
     * Szok cenowy aktywa: pct w procentach (np. 150 => +150%, -99 => -99%).
     * Działa wprost na cenę rynkową (pomija impact/grzęzę — to panel boga).
     */
    applyShock(assetId, pct) {
      if (!this.unlocked) return { success: false, reason: 'Zablokowane' };
      const found = this._findAsset(assetId);
      if (!found) return { success: false, reason: 'Nieznane aktywo: ' + assetId };

      const cleanPct = Math.max(-99.9, Math.min(1000, parseFloat(pct) || 0));
      const pk = this._priceKey(found.item);
      const base = found.item.basePrice || found.item.baseSharePrice || found.item[pk];
      let next = found.item[pk] * (1 + cleanPct / 100);
      next = Math.max(base * 0.001, Math.min(base * 40, next)); // twardy płot sanityzacji
      found.item[pk] = Math.round(next * 100) / 100;
      return { success: true, data: { asset: assetId, newPrice: found.item[pk] } };
    },

    /** Reset ceny do wartości fundamentalnej (basePrice / baseSharePrice). */
    resetToBase(assetId) {
      if (!this.unlocked) return { success: false, reason: 'Zablokowane' };
      const found = this._findAsset(assetId);
      if (!found) return { success: false, reason: 'Nieznane aktywo' };
      const pk = this._priceKey(found.item);
      const base = found.item.basePrice || found.item.baseSharePrice || found.item[pk];
      found.item.basePrice = found.item.basePrice || base; // przywróć kotwicę
      found.item[pk] = base;
      return { success: true };
    },

    /** Szok na WSZYSTKICH aktywach naraz (np. -50 = globalny krach). */
    shockAll(pct) {
      if (!this.unlocked) return { success: false, reason: 'Zablokowane' };
      const market = this._market();
      const ids = [
        ...(market.commodities || []).map(c => c.id),
        ...(market.stocks || []).map(s => s.ticker)
      ];
      ids.forEach(id => this.applyShock(id, pct));
      return { success: true, data: { affected: ids.length } };
    },

    /** Dosypanie gotówki do skarbca własnego kraju. */
    addTreasury(amountUsd) {
      if (!this.unlocked) return { success: false, reason: 'Zablokowane' };
      const c = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!c) return { success: false, reason: 'Brak aktywnej gry' };
      c.treasury += Math.round(amountUsd || 0);
      return { success: true, data: { treasury: c.treasury } };
    },

    /** Dosypanie złota (w tonach) do rezerw własnego kraju. */
    addGoldTonnes(tonnes) {
      if (!this.unlocked) return { success: false, reason: 'Zablokowane' };
      const c = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!c) return { success: false, reason: 'Brak aktywnej gry' };
      const oz = Math.round((tonnes || 0) * 32150.7);
      c.portfolio = c.portfolio || { commodities: {}, stocks: {} };
      c.portfolio.commodities = c.portfolio.commodities || {};
      c.portfolio.commodities.gold = (c.portfolio.commodities.gold || 0) + oz;
      return { success: true, data: { goldOz: c.portfolio.commodities.gold } };
    },

    // ─────────────────────────── UI (pływający panel) ───────────────────────────

    showPanel() {
      if (!this.unlocked || this.panelEl) return;
      const F = window.WorldForge.Format;

      const el = document.createElement('div');
      el.id = 'wf-admin-panel';
      el.style.cssText = 'position: fixed; top: 12px; right: 12px; z-index: 99999; width: 260px; background: #0d1319; border: 1px solid #f5b445; border-radius: 6px; box-shadow: 0 8px 32px rgba(0,0,0,.6); font-family: monospace; font-size: 11px; color: #dde5ec; padding: 10px;';

      const market = this._market();
      const options = [
        ...(market.commodities || []).map(c => `<option value="${c.id}">🥇 ${c.name}</option>`),
        ...(market.stocks || []).map(s => `<option value="${s.ticker}">🏢 ${s.ticker} — ${s.name}</option>`)
      ].join('');

      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="color:#f5b445;">⚙ MASTER GIEŁDY</strong>
          <span>
            <button id="wf-adm-hide" title="Ukryj (panel wróci po ?admin)" style="background:none;border:none;color:#9fb0bf;cursor:pointer;font-size:12px;">✕</button>
          </span>
        </div>
        <select id="wf-adm-asset" style="width:100%; margin-bottom:4px; background:#18212a; color:#dde5ec; border:1px solid #263340; border-radius:3px; padding:3px;">${options}</select>
        <div style="display:flex; gap:4px; margin-bottom:6px;">
          <input id="wf-adm-pct" type="number" value="-99" min="-99.9" max="1000" step="1" style="flex:1; background:#18212a; color:#f0635a; border:1px solid #263340; border-radius:3px; padding:3px;" />
          <button id="wf-adm-apply" style="background:#f5b445; color:#0d1319; border:none; border-radius:3px; padding:4px 8px; cursor:pointer; font-weight:bold;">%</button>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:3px;">
          <button data-q="gold:+150" style="flex:1; background:#18212a; border:1px solid #33465a; color:#4fce7d; border-radius:3px; padding:3px 5px; cursor:pointer;">🥇 +150%</button>
          <button data-q="gold:-99" style="flex:1; background:#18212a; border:1px solid #33465a; color:#f0635a; border-radius:3px; padding:3px 5px; cursor:pointer;">🥇 −99%</button>
          <button data-q="all:-50" style="flex:1; background:#18212a; border:1px solid #33465a; color:#f0635a; border-radius:3px; padding:3px 5px; cursor:pointer;">💥 Wszystko −50%</button>
          <button data-q="reset" style="flex:1; background:#18212a; border:1px solid #33465a; color:#4cc2ff; border-radius:3px; padding:3px 5px; cursor:pointer;">↺ Reset</button>
          <button data-q="treasury" style="flex:1; background:#18212a; border:1px solid #33465a; color:#4fce7d; border-radius:3px; padding:3px 5px; cursor:pointer;">💰 +100 mld</button>
          <button data-q="goldt" style="flex:1; background:#18212a; border:1px solid #33465a; color:#f5b445; border-radius:3px; padding:3px 5px; cursor:pointer;">🥇 +100 t</button>
          <button data-q="lock" style="flex:1; background:#2a1215; border:1px solid #593b3b; color:#f0635a; border-radius:3px; padding:3px 5px; cursor:pointer;">🔒 Zablokuj</button>
        </div>
        <div id="wf-adm-status" style="margin-top:5px; color:#67727e; font-size:10px;">ukryte narzędzie hosta</div>
      `;
      document.body.appendChild(el);
      this.panelEl = el;

      const status = (txt, ok) => {
        const s = el.querySelector('#wf-adm-status');
        if (s) { s.textContent = txt; s.style.color = ok === false ? '#f0635a' : '#4fce7d'; }
      };

      el.querySelector('#wf-adm-hide').onclick = () => this.hidePanel();
      el.querySelector('#wf-adm-apply').onclick = () => {
        const asset = el.querySelector('#wf-adm-asset').value;
        const pct = parseFloat(el.querySelector('#wf-adm-pct').value || 0);
        const r = this.applyShock(asset, pct);
        const found = this._findAsset(asset);
        const price = found ? found.item[this._priceKey(found.item)] : '?';
        status(r.success ? `${asset}: ${pct > 0 ? '+' : ''}${pct}% → ${price}` : r.reason, r.success);
      };

      el.querySelectorAll('button[data-q]').forEach(btn => {
        btn.onclick = () => {
          const [op, arg] = (btn.getAttribute('data-q') || '').split(':');
          if (op === 'gold') this.applyShock('gold', parseFloat(arg));
          else if (op === 'all') this.shockAll(parseFloat(arg));
          else if (op === 'reset') { this.resetToBase(el.querySelector('#wf-adm-asset').value); this.shockAll(0); }
          else if (op === 'treasury') this.addTreasury(100000000000);
          else if (op === 'goldt') this.addGoldTonnes(100);
          else if (op === 'lock') { this.lock(); return; }
          status('gotowe ✓', true);
        };
      });

      void F;
    },

    hidePanel() {
      if (this.panelEl) {
        this.panelEl.remove();
        this.panelEl = null;
      }
    },

    /** Inicjalizacja: sprawdza ?admin=KLUCZ oraz sesję. Nici śladu bez klucza. */
    init() {
      try {
        const urlKey = new URLSearchParams(window.location.search).get('admin');
        if (urlKey && this.unlock(urlKey)) {
          console.log('[WF] Tryb mistrza giełdy odblokowany.');
          this.showPanel();
        } else {
          try { if (sessionStorage.getItem('wf_admin') === '1') { this.unlocked = true; this.showPanel(); } } catch (e) {}
        }
      } catch (e) { /* ignoruj */ }
    }
  };

  window.WorldForge.Admin = AdminPanel;

  // Autostart po załadowaniu (po DOMContentLoaded, bez śladu gdy brak klucza)
  window.addEventListener('DOMContentLoaded', () => AdminPanel.init());
})();
