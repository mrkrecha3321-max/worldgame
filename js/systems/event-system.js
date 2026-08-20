/**
 * WorldForge: Nations - Events & Crises Simulation System
 * Evaluates dynamic scenario triggers, interactive player dilemmas, and systemic outcomes.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const EventSystem = {
    /**
     * Resolve interactive choice made by player or bot
     */
    resolveChoice(state, countryId, eventId, choiceIndex = 0, turn = 1) {
      const eventsCatalog = window.WorldForge.Data.Events || [];
      const eventMeta = eventsCatalog.find(e => e.id === eventId);
      const country = state.countries[countryId];

      if (!eventMeta || !country) {
        return { success: false, reason: 'Nie znaleziono wydarzenia lub państwa' };
      }

      const choice = (eventMeta.choices && eventMeta.choices[choiceIndex]) ? eventMeta.choices[choiceIndex] : null;
      if (!choice) {
        return { success: false, reason: 'Nieprawidłowa opcja decyzji' };
      }

      // Check cost if applicable
      if (choice.cost && choice.cost > 0) {
        if (country.treasury < choice.cost) {
          return { success: false, reason: 'Brak środków w skarbie państwa na sfinansowanie wybranej opcji' };
        }
        country.treasury -= choice.cost;
      }

      // Apply outcome effects
      this.applyEventEffects(country, choice.effects || {});

      // Record in event history
      state.eventHistory.push({
        eventId,
        title: eventMeta.title,
        countryId,
        chosenOptionText: choice.text,
        turn,
        resolvedAt: Date.now()
      });
      if (state.eventHistory.length > 80) {
        state.eventHistory = state.eventHistory.slice(-80);
      }

      // Remove from active pending events if present
      state.activeEvents = state.activeEvents.filter(e => e.eventId !== eventId);

      window.WorldForge.Core.GameState.addNotification(
        'info',
        `Rozstrzygnięto: ${eventMeta.title}`,
        `Wybrano wariant: ${choice.text}`,
        countryId
      );

      return { success: true, data: { eventId, choiceIndex, effects: choice.effects } };
    },

    applyEventEffects(country, eff) {
      const V = window.WorldForge.Core.Validators;
      if (eff.treasuryChange) country.treasury += eff.treasuryChange;
      if (eff.approvalChange) country.economy.socialApproval = V.clampPercent(country.economy.socialApproval + eff.approvalChange);
      if (eff.politicalStabilityChange) country.economy.politicalStability = V.clampPercent(country.economy.politicalStability + eff.politicalStabilityChange);
      if (eff.gdpGrowthChange) country.economy.gdpGrowthYoY += eff.gdpGrowthChange;
      if (eff.inflationChange) country.economy.inflation = V.sanitizeNumber(country.economy.inflation + eff.inflationChange, 2.5, -2, 100);
      if (eff.unemploymentChange) country.economy.unemployment = V.sanitizeNumber(country.economy.unemployment + eff.unemploymentChange, 5.0, 1, 40);
      if (eff.deterrenceScoreChange) country.military.deterrenceScore = V.clampPercent(country.military.deterrenceScore + eff.deterrenceScoreChange);
      if (eff.taxEfficiencyChange) country.taxes.efficiency = V.clampPercent(country.taxes.efficiency + eff.taxEfficiencyChange);
      if (eff.bubbleRiskChange) country.creditMarket.bubbleRiskScore = V.clampPercent(country.creditMarket.bubbleRiskScore + eff.bubbleRiskChange);
    },

    /**
     * Monthly event evaluation loop
     */
    processMonthly(state, turnNumber) {
      const eventsCatalog = window.WorldForge.Data.Events || [];
      const R = window.WorldForge.Core.Random;

      for (const eventMeta of eventsCatalog) {
        // Evaluate for Player Country
        const playerCountry = window.WorldForge.Core.GameState.getPlayerCountry();
        if (playerCountry && eventMeta.triggerCondition) {
          try {
            const triggered = eventMeta.triggerCondition(playerCountry, state);
            if (triggered) {
              // Check if already active
              if (!state.activeEvents.some(e => e.eventId === eventMeta.id)) {
                state.activeEvents.push({
                  eventId: eventMeta.id,
                  title: eventMeta.title,
                  icon: eventMeta.icon,
                  description: eventMeta.description,
                  choices: eventMeta.choices,
                  countryId: state.playerCountryId,
                  turn: turnNumber
                });

                window.WorldForge.Core.GameState.addNotification(
                  'event',
                  `Wydarzenie: ${eventMeta.title}`,
                  eventMeta.description,
                  state.playerCountryId,
                  { eventId: eventMeta.id, isCrisis: true }
                );
              }
            }
          } catch (e) {
            console.error(`[EventSystem] Error evaluating trigger for ${eventMeta.id}:`, e);
          }
        }
      }
    }
  };

  window.WorldForge.Systems.Event = EventSystem;
})();
