/**
 * WorldForge: Nations - Notifications & News Feed UI
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const NotificationsUI = {
    renderDrawer() {
      const container = document.getElementById('right-drawer-content');
      if (!container) return;

      const state = window.WorldForge.Core.GameState.getState();
      if (!state || !state.notifications) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">Brak powiadomień.</div>';
        return;
      }

      if (state.notifications.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 16px;">Brak nowych alertów w tej turze.</div>';
        return;
      }

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${state.notifications.map(notif => {
            const timeAgo = `Miesiąc ${notif.turn}`;
            const isClickable = notif.isCrisis ? 'cursor: pointer; border-color: var(--accent);' : '';
            return `
              <div class="notif-card ${notif.type}" style="${isClickable}" data-notif-event-id="${notif.eventId || ''}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span class="notif-title">${notif.title}</span>
                  <span class="notif-time">${timeAgo}</span>
                </div>
                <div class="notif-desc">${notif.message}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Event click handling
      const eventCards = container.querySelectorAll('[data-notif-event-id]');
      eventCards.forEach(card => {
        const evtId = card.getAttribute('data-notif-event-id');
        if (evtId) {
          card.onclick = () => {
            const activeEvent = state.activeEvents?.find(e => e.eventId === evtId);
            if (activeEvent) {
              window.WorldForge.UI.Modal.showEventDecision(activeEvent, (choiceIndex) => {
                window.WorldForge.Core.Commands.dispatch({
                  type: 'RESOLVE_EVENT_CHOICE',
                  countryId: state.playerCountryId,
                  payload: { eventId: activeEvent.eventId, choiceIndex }
                });
              });
            }
          };
        }
      });
    }
  };

  window.WorldForge.UI.Notifications = NotificationsUI;
})();
