/**
 * WorldForge: Nations - Diplomacy & International Relations System
 * Simulates bilateral diplomatic standing (-100 to +100), foreign aid, sovereign loans,
 * sanctions, joint development pacts, and heuristic bot treaty evaluation.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const DiplomacySystem = {
    /**
     * Perform diplomatic initiative
     */
    performAction(state, initiatorId, payload, turn = 1) {
      const V = window.WorldForge.Core.Validators;
      const { targetId, actionType, amount } = payload;
      const initiator = state.countries[initiatorId];
      const target = state.countries[targetId];

      if (!initiator || !target || initiatorId === targetId) {
        return { success: false, reason: 'Nieprawidłowe państwo docelowe' };
      }

      const currentRel = initiator.diplomacy?.relations[targetId] || 0;

      switch (actionType) {
        case 'IMPROVE_RELATIONS': {
          const cost = 80; // mln USD
          if (initiator.treasury < cost) return { success: false, reason: 'Niewystarczające środki na misję dyplomatyczną (wymagane 80 mln $)' };
          initiator.treasury -= cost;
          this.adjustRelations(initiator, target, +10);
          return { success: true, data: { action: 'IMPROVE_RELATIONS', newRel: initiator.diplomacy.relations[targetId] } };
        }

        case 'FOREIGN_AID': {
          const cleanAmount = V.clampNonNegative(amount, 200);
          if (initiator.treasury < cleanAmount) return { success: false, reason: 'Brak środków w skarbie na pomoc zagraniczną' };
          initiator.treasury -= cleanAmount;
          target.treasury += cleanAmount;
          const boost = Math.min(25, Math.round(cleanAmount / 20));
          this.adjustRelations(initiator, target, boost);
          return { success: true, data: { action: 'FOREIGN_AID', amount: cleanAmount, boost } };
        }

        case 'SIGN_NON_AGGRESSION': {
          if (currentRel < 20) {
            return { success: false, reason: `Państwo ${target.namePl} uważa obecne stosunki (${currentRel}) za zbyt chłodne na podpisanie paktu.` };
          }
          this.adjustRelations(initiator, target, +15);
          return { success: true, data: { action: 'SIGN_NON_AGGRESSION' } };
        }

        case 'IMPOSE_SANCTIONS': {
          if (!initiator.diplomacy.sanctionsAgainst) initiator.diplomacy.sanctionsAgainst = [];
          if (!initiator.diplomacy.sanctionsAgainst.includes(targetId)) {
            initiator.diplomacy.sanctionsAgainst.push(targetId);
          }
          this.adjustRelations(initiator, target, -35);
          return { success: true, data: { action: 'IMPOSE_SANCTIONS', targetId } };
        }

        case 'LIFT_SANCTIONS': {
          if (initiator.diplomacy.sanctionsAgainst) {
            initiator.diplomacy.sanctionsAgainst = initiator.diplomacy.sanctionsAgainst.filter(id => id !== targetId);
          }
          this.adjustRelations(initiator, target, +15);
          return { success: true, data: { action: 'LIFT_SANCTIONS', targetId } };
        }

        default:
          return { success: false, reason: `Nieznana akcja dyplomatyczna: ${actionType}` };
      }
    },

    adjustRelations(c1, c2, delta) {
      const V = window.WorldForge.Core.Validators;
      if (c1.diplomacy && c1.diplomacy.relations) {
        c1.diplomacy.relations[c2.id] = V.clampRelation((c1.diplomacy.relations[c2.id] || 0) + delta);
      }
      if (c2.diplomacy && c2.diplomacy.relations) {
        c2.diplomacy.relations[c1.id] = V.clampRelation((c2.diplomacy.relations[c1.id] || 0) + delta);
      }
    },

    /**
     * Monthly diplomacy drift
     */
    processMonthly(state, turnNumber) {
      // Small passive drift toward neutral 0
      for (const country of Object.values(state.countries)) {
        if (!country.diplomacy || !country.diplomacy.relations) continue;
        for (const [targetId, score] of Object.entries(country.diplomacy.relations)) {
          if (score > 10) {
            country.diplomacy.relations[targetId] -= 0.1;
          } else if (score < -10) {
            country.diplomacy.relations[targetId] += 0.1;
          }
        }
      }
    }
  };

  window.WorldForge.Systems.Diplomacy = DiplomacySystem;
})();
