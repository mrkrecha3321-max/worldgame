/**
 * WorldForge: Nations - Navigation & Status Bar UI
 * Clean, monochromatic SVG icons, unique non-duplicated tabs, resizable drawer controls.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const Navigation = {
    activeTabId: 'overview',

    NAV_ITEMS: [
      {
        id: 'overview',
        label: 'Przegląd Państwa',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
      },
      {
        id: 'exchange',
        label: 'Giełda Globalna i Złoto',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>'
      },
      {
        id: 'budget',
        label: 'Budżet i Podatki',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
      },
      {
        id: 'banking',
        label: 'Bank Centralny i Dług',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 6 12 3 19 6"/><line x1="6" y1="10" x2="6" y2="21"/><line x1="10" y1="10" x2="10" y2="21"/><line x1="14" y1="10" x2="14" y2="21"/><line x1="18" y1="10" x2="18" y2="21"/></svg>'
      },
      {
        id: 'economy',
        label: 'Gospodarka i Fabryki',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>'
      },
      {
        id: 'trade',
        label: 'Handel i Kontrakty',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>'
      },
      {
        id: 'space',
        label: 'Program Kosmiczny',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>'
      },
      {
        id: 'conflict',
        label: 'Wywiad i Bezpieczeństwo',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M2 12h20"/><path d="M20 12v8H4v-8"/><path d="m4 4 16 16"/><path d="m4 20 16-16"/></svg>'
      },
      {
        id: 'infrastructure',
        label: 'Infrastruktura i KSE',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
      },
      {
        id: 'research',
        label: 'Badania i Technologie',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M10 2v7.31L4.41 18.9A2 2 0 0 0 6 22h12a2 2 0 0 0 1.59-3.1L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/></svg>'
      },
      {
        id: 'military',
        label: 'Obronność i Odstraszanie',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
      },
      {
        id: 'diplomacy',
        label: 'Dyplomacja i Pożyczki',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
      },
      {
        id: 'population',
        label: 'Ludność i Zdrowie',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      },
      {
        id: 'reports',
        label: 'Raporty Miesięczne',
        svg: '<svg class="svg-icon" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
      }
    ],

    init() {
      this.renderSidebar();
      this.bindSpeedControls();
      this.bindDrawerCollapse();
      this.bindCurrencyToggle();
    },

    renderSidebar() {
      const container = document.getElementById('sidebar-nav-items');
      if (!container) return;

      container.innerHTML = this.NAV_ITEMS.map(item => `
        <div class="nav-item ${this.activeTabId === item.id ? 'active' : ''}" data-tab="${item.id}" data-label="${item.label}">
          <span class="nav-icon">${item.svg}</span>
        </div>
      `).join('');

      container.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
          const tabId = item.getAttribute('data-tab');
          this.switchTab(tabId);
        };
      });
    },

    switchTab(tabId) {
      this.activeTabId = tabId;
      this.renderSidebar();
      window.WorldForge.UI.App.renderActiveTab(tabId);
    },

    updateTopBar() {
      const state = window.WorldForge.Core.GameState.getState();
      const country = window.WorldForge.Core.GameState.getPlayerCountry();
      if (!state || !country) return;

      const F = window.WorldForge.Format;
      const dateInfo = F.formatTurnDate(state.time.startDate, state.time.currentTurn);

      // Top Country Badge
      const countryFlagEl = document.getElementById('top-country-flag');
      const countryNameEl = document.getElementById('top-country-name');
      if (countryFlagEl) countryFlagEl.textContent = country.flag;
      if (countryNameEl) countryNameEl.textContent = `${country.namePl} (${country.currency})`;

      // Date indicator
      const dateEl = document.getElementById('top-date-display');
      if (dateEl) dateEl.textContent = `${dateInfo.formatted} • M-c ${state.time.currentTurn}`;

      // Treasury & Balance
      const treasuryEl = document.getElementById('top-stat-treasury');
      const balanceEl = document.getElementById('top-stat-balance');
      if (treasuryEl) treasuryEl.innerHTML = F.money(country.treasury, 'USD');
      if (balanceEl) {
        const bal = country.budget.balanceMonthly;
        balanceEl.innerHTML = F.delta(bal, false, 'USD');
      }

      // Macro Stats
      const gdpEl = document.getElementById('top-stat-gdp');
      const inflationEl = document.getElementById('top-stat-inflation');
      const unempEl = document.getElementById('top-stat-unemployment');
      const approvalEl = document.getElementById('top-stat-approval');
      const deterrenceEl = document.getElementById('top-stat-deterrence');

      if (gdpEl) gdpEl.innerHTML = F.money(country.economy.gdpNominal, 'USD');
      if (inflationEl) inflationEl.textContent = `${country.economy.inflation.toFixed(1)}%`;
      if (unempEl) unempEl.textContent = `${country.economy.unemployment.toFixed(1)}%`;
      if (approvalEl) approvalEl.textContent = `${country.economy.socialApproval.toFixed(0)}%`;
      if (deterrenceEl) deterrenceEl.textContent = `${country.military?.deterrenceScore || 50}/100`;

      // Notifications badge counter
      const unreadCount = state.notifications?.filter(n => !n.read).length || 0;
      const notifBadge = document.getElementById('notif-badge-count');
      if (notifBadge) {
        notifBadge.textContent = unreadCount > 0 ? unreadCount : '';
        notifBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
      }
    },

    updateTimeline(data) {
      const progressBar = document.getElementById('turn-progress-fill');
      const timeRemaining = document.getElementById('bottom-time-remaining');
      if (progressBar) progressBar.style.width = `${data.progressPercent}%`;
      if (timeRemaining) timeRemaining.textContent = `${data.remainingSeconds}s`;
    },

    bindSpeedControls() {
      const pauseBtn = document.getElementById('btn-speed-pause');
      const s1Btn = document.getElementById('btn-speed-1x');
      const s2Btn = document.getElementById('btn-speed-2x');
      const s4Btn = document.getElementById('btn-speed-4x');
      const nextTurnBtn = document.getElementById('btn-next-turn-now');

      const updateSpeedButtonUI = (speed) => {
        [pauseBtn, s1Btn, s2Btn, s4Btn].forEach(b => b?.classList.remove('active'));
        if (speed === 0 && pauseBtn) pauseBtn.classList.add('active');
        if (speed === 1 && s1Btn) s1Btn.classList.add('active');
        if (speed === 2 && s2Btn) s2Btn.classList.add('active');
        if (speed === 4 && s4Btn) s4Btn.classList.add('active');
      };

      if (pauseBtn) pauseBtn.onclick = () => {
        window.WorldForge.Core.TurnEngine.setSpeed(0);
        updateSpeedButtonUI(0);
      };
      if (s1Btn) s1Btn.onclick = () => {
        window.WorldForge.Core.TurnEngine.setSpeed(1);
        updateSpeedButtonUI(1);
      };
      if (s2Btn) s2Btn.onclick = () => {
        window.WorldForge.Core.TurnEngine.setSpeed(2);
        updateSpeedButtonUI(2);
      };
      if (s4Btn) s4Btn.onclick = () => {
        window.WorldForge.Core.TurnEngine.setSpeed(4);
        updateSpeedButtonUI(4);
      };

      if (nextTurnBtn) {
        nextTurnBtn.onclick = () => {
          window.WorldForge.Core.TurnEngine.nextTurn();
        };
      }
    },

    bindCurrencyToggle() {
      const select = document.getElementById('currency-display-selector');
      if (select) {
        select.onchange = (e) => {
          window.WorldForge.Format.setDisplayCurrencyMode(e.target.value);
          this.updateTopBar();
          window.WorldForge.UI.App.renderActiveTab(this.activeTabId);
        };
      }
    },

    bindDrawerCollapse() {
      const toggleBtn = document.getElementById('btn-toggle-news-drawer');
      const drawer = document.getElementById('right-drawer');
      if (toggleBtn && drawer) {
        toggleBtn.onclick = () => {
          drawer.classList.toggle('collapsed');
        };
      }
    }
  };

  window.WorldForge.UI.Navigation = Navigation;
})();
