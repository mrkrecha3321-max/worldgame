/**
 * WorldForge: Nations - Intelligence, Hybrid Operations & Conflict Simulation System
 * Manages tension meters, espionage, cyber warfare, missile strikes, air defense and peace treaties.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const ConflictSystem = {
    executeIntelligenceOp(state, sourceId, payload, turn = 1) {
      const V = window.WorldForge.Core.Validators;
      const R = window.WorldForge.Core.Random;
      const F = window.WorldForge.Format;

      const source = state.countries[sourceId];
      const target = state.countries[payload.targetCountryId];
      const opType = payload.opType; // 'STEAL_TECH', 'SABOTAGE_FACTORY', 'CYBER_ATTACK', 'DESTABILIZE'

      if (!source || !target || sourceId === payload.targetCountryId) {
        return { success: false, reason: 'Nieprawidłowe państwo docelowe' };
      }

      const opCost = 450000000; // 450 mln USD
      if (source.treasury < opCost) {
        return { success: false, reason: `Niewystarczające środki na operację wywiadowczą (${F.money(opCost, 'USD')})` };
      }

      source.treasury -= opCost;

      // Roll success probability based on Cyber Defense and Intelligence capability
      const sourceCyber = source.military?.branches?.cyberDefense?.equipmentQuality || 70;
      const targetCyber = target.military?.branches?.cyberDefense?.equipmentQuality || 70;
      const successChance = Math.max(0.25, Math.min(0.85, 0.55 + (sourceCyber - targetCyber) * 0.005));

      const isSuccess = R.chance(successChance);

      // Diplomatic penalty regardless of success if detected
      if (target.diplomacy?.relations[sourceId] !== undefined) {
        target.diplomacy.relations[sourceId] = V.clampRelation(target.diplomacy.relations[sourceId] - 25);
      }

      if (isSuccess) {
        let resultMsg = '';
        if (opType === 'STEAL_TECH') {
          source.research.monthlyPoints += 600;
          resultMsg = `Pomyślnie wykradziono dokumentację technologiczną z instytutów badawczych ${target.namePl} (+600 pkt B+R).`;
        } else if (opType === 'SABOTAGE_FACTORY') {
          if (target.factories && target.factories.length > 0) {
            const fac = target.factories[0];
            fac.status = 'BUILDING';
            fac.remainingMonths = 3;
            resultMsg = `Agenci wywiadu unieruchomili zakład "${fac.name}" w państwie ${target.namePl} na 3 miesiące.`;
          } else {
            resultMsg = `Sabotaż infrastruktury energetycznej w ${target.namePl} zakończony sukcesem.`;
          }
        } else if (opType === 'CYBER_ATTACK') {
          target.infrastructure.powerGridReliability = Math.max(40, target.infrastructure.powerGridReliability - 15);
          target.energy.blackoutRisk = Math.min(60, target.energy.blackoutRisk + 20);
          resultMsg = `Zmasowany cyberatak sparaliżował podstacje elektroenergetyczne i serwery bankowe w ${target.namePl}.`;
        } else {
          target.economy.socialApproval = Math.max(5, target.economy.socialApproval - 10);
          target.economy.politicalStability = Math.max(10, target.economy.politicalStability - 12);
          resultMsg = `Operacja dezinformacyjna i wsparcie opozycji obniżyły stabilność polityczną rządu ${target.namePl}.`;
        }

        window.WorldForge.Core.GameState.addNotification('success', 'Sukces Operacji Wywiadowczej', resultMsg, sourceId);
        return { success: true, data: { isSuccess: true, opType, message: resultMsg } };
      } else {
        const failMsg = `Operacja wywiadowcza przeciwko ${target.namePl} została zdemaskowana przez ich kontrwywiad!`;
        window.WorldForge.Core.GameState.addNotification('danger', 'Wpadka Służb Wywiadowczych', failMsg, sourceId);
        return { success: false, reason: failMsg };
      }
    },

    executeStrategicStrike(state, sourceId, payload) {
      const R = window.WorldForge.Core.Random;
      const F = window.WorldForge.Format;

      const source = state.countries[sourceId];
      const target = state.countries[payload.targetCountryId];

      if (!source || !target) return { success: false, reason: 'Nieprawidłowy cel' };

      const strikeCost = 800000000; // 800 mln USD (amunicja i paliwo rakietowe)
      if (source.treasury < strikeCost) {
        return { success: false, reason: `Brak środków na salwę rakietową (${F.money(strikeCost, 'USD')})` };
      }

      source.treasury -= strikeCost;

      // Air Defense Interception Check (Patriot / CAMM / S-400)
      const airDefQuality = target.military?.branches?.airDefense?.equipmentQuality || 65;
      const interceptionChance = Math.min(0.85, airDefQuality / 100);

      const intercepted = R.chance(interceptionChance);

      if (intercepted) {
        window.WorldForge.Core.GameState.addNotification(
          'info',
          'Atak Powstrzymany przez Obronę Przeciwlotniczą',
          `Baterie obrony przeciwlotniczej ${target.namePl} przechwyciły i zestrzeliły wrogą salwę rakietową!`,
          sourceId
        );
        return { success: true, data: { intercepted: true } };
      } else {
        target.infrastructure.powerGridReliability = Math.max(30, target.infrastructure.powerGridReliability - 25);
        target.military.deterrenceScore = Math.max(10, target.military.deterrenceScore - 15);
        target.economy.socialApproval = Math.max(5, target.economy.socialApproval - 12);

        window.WorldForge.Core.GameState.addNotification(
          'danger',
          'Uderzenie Rakietowe Sięgnęło Celu!',
          `Pociski manewrujące przełamały obronę i zniszczyły węzły infrastruktury strategicznej w ${target.namePl}!`,
          sourceId
        );
        return { success: true, data: { intercepted: false } };
      }
    },

    processMonthly(state, turnNumber) {
      // Passive conflict tensions drift
    }
  };

  window.WorldForge.Systems.Conflict = ConflictSystem;
})();
