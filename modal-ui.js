/**
 * WorldForge: Nations - Modal UI System
 * Sober, sharp dialogs, confirmation prompts and crisis dilemmas.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const ModalUI = {
    show(options) {
      this.close();

      const backdrop = document.createElement('div');
      backdrop.className = 'wf-modal-backdrop';
      backdrop.id = 'active-wf-modal';

      const dialog = document.createElement('div');
      dialog.className = 'wf-modal-dialog';

      // Header
      const header = document.createElement('div');
      header.className = 'modal-header';
      header.innerHTML = `
        <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${options.title || 'Komunikat'}</h3>
        <button class="wf-btn wf-btn-sm wf-btn-secondary" id="modal-close-x">✕</button>
      `;

      // Body
      const body = document.createElement('div');
      body.className = 'modal-body';
      body.innerHTML = options.contentHtml || '';

      // Footer
      const footer = document.createElement('div');
      footer.className = 'modal-footer';

      const buttons = options.buttons || [{ text: 'Zamknij', class: 'wf-btn-secondary', onClick: () => this.close() }];
      buttons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.className = `wf-btn ${btnConfig.class || 'wf-btn-secondary'}`;
        btn.textContent = btnConfig.text;
        btn.onclick = () => {
          if (btnConfig.onClick) {
            btnConfig.onClick();
          }
          if (btnConfig.autoClose !== false) {
            this.close();
          }
        };
        footer.appendChild(btn);
      });

      dialog.appendChild(header);
      dialog.appendChild(body);
      dialog.appendChild(footer);
      backdrop.appendChild(dialog);
      document.body.appendChild(backdrop);

      document.getElementById('modal-close-x').onclick = () => this.close();
      backdrop.onclick = (e) => {
        if (e.target === backdrop && options.dismissible !== false) {
          this.close();
        }
      };
    },

    showEventDecision(eventData, onChoiceSelected) {
      const choicesHtml = (eventData.choices || []).map((choice, index) => {
        const costBadge = choice.cost ? `<span class="wf-badge wf-badge-amber">Koszt: $${choice.cost}M</span>` : '';
        return `
          <div style="background: var(--bg-panel-secondary); border: 1px solid var(--border); border-radius: var(--border-radius-xs); padding: 10px; display: flex; flex-direction: column; gap: 6px;">
            <div style="font-weight: 500; font-size: 12px; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center;">
              <span>Wariant ${index + 1}: ${choice.text}</span>
              ${costBadge}
            </div>
            <button class="wf-btn wf-btn-primary wf-btn-sm event-choice-btn" data-choice-index="${index}">
              Wybierz ten wariant
            </button>
          </div>
        `;
      }).join('');

      const contentHtml = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <p style="color: var(--text-secondary); line-height: 1.45; font-size: 12px;">${eventData.description}</p>
          <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: var(--text-secondary); margin-top: 4px;">Dostępne warianty decyzji rządu:</div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${choicesHtml}
          </div>
        </div>
      `;

      this.show({
        title: `KRYZYS: ${eventData.title}`,
        contentHtml: contentHtml,
        dismissible: false,
        buttons: []
      });

      const choiceButtons = document.querySelectorAll('.event-choice-btn');
      choiceButtons.forEach(btn => {
        btn.onclick = () => {
          const index = parseInt(btn.getAttribute('data-choice-index'), 10);
          this.close();
          if (onChoiceSelected) onChoiceSelected(index);
        };
      });
    },

    close() {
      const active = document.getElementById('active-wf-modal');
      if (active) {
        active.remove();
      }
    }
  };

  window.WorldForge.UI.Modal = ModalUI;
})();
