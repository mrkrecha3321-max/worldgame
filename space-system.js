/**
 * WorldForge: Nations - National Space Race Program Simulation System
 * Manages spaceport construction, satellite constellations, orbital stations, and lunar missions.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const SpaceSystem = {
    MISSIONS: [
      { id: 'mission_spaceport', tier: 1, name: 'Budowa Kosmodromu i Centrum Startowego', cost: 3500000000, durationMonths: 18, reqTech: 'tech_power_grid_1', desc: 'Podstawa infrastrukturalna umożliwiająca wystrzeliwanie rakiet nośnych.' },
      { id: 'mission_spy_sat', tier: 2, name: 'Satelita Zwiadu Optycznego i Szpiegowski', cost: 1200000000, durationMonths: 8, reqTier: 1, desc: 'Ujawnia stany magazynowe, fabryki i ruchy wojskowe innych państw.' },
      { id: 'mission_telecom_sat', tier: 2, name: 'Konstelacja Satelitów Telekomunikacyjnych 5G', cost: 1800000000, durationMonths: 10, reqTier: 1, desc: 'Zwiększa produktywność sektora IT i podnosi wzrost PKB o +0.3%.' },
      { id: 'mission_gps_sat', tier: 2, name: 'Suwerenny System Nawigacji Satelitarnej (GPS/Galileo)', cost: 2200000000, durationMonths: 12, reqTier: 1, desc: 'Poprawia logistykę, wydajność rolnictwa precyzyjnego i precyzję rakiet.' },
      { id: 'mission_space_station', tier: 3, name: 'Załogowa Modułowa Stacja Orbitalna', cost: 8500000000, durationMonths: 24, reqTier: 2, desc: 'Laboratoria w mikrograwitacji dają +150 pkt badań B+R co miesiąc.' },
      { id: 'mission_lunar_landing', tier: 4, name: 'Załogowe Lądowanie na Księżycu (Moon Landing)', cost: 16000000000, durationMonths: 36, reqTier: 3, desc: 'Historyczny krok ludzkości. Zapewnia status supermocarstwa i dostęp do złóż Helu-3.' }
    ],

    launchMission(country, missionId, turn = 1) {
      const V = window.WorldForge.Core.Validators;
      const F = window.WorldForge.Format;
      const mission = this.MISSIONS.find(m => m.id === missionId);
      if (!mission) return { success: false, reason: 'Nie odnaleziono misji' };

      if (!country.spaceProgram) {
        country.spaceProgram = { tier: 0, activeMissions: [], completedMissions: [], satellites: 0, moonLanded: false };
      }

      if (country.spaceProgram.completedMissions.includes(missionId)) {
        return { success: false, reason: 'Ta misja została już pomyślnie zrealizowana' };
      }

      if (country.spaceProgram.activeMissions.some(m => m.id === missionId)) {
        return { success: false, reason: 'Ta misja jest już w trakcie realizacji' };
      }

      if (mission.reqTier && country.spaceProgram.tier < mission.reqTier) {
        return { success: false, reason: `Wymagany wcześniejszy poziom programu kosmicznego: Poziom ${mission.reqTier}` };
      }

      if (country.treasury < mission.cost) {
        return { success: false, reason: `Niewystarczające środki w Skarbie Państwa (wymagane ${F.money(mission.cost, 'USD')})` };
      }

      country.treasury -= mission.cost;

      const activeMission = {
        id: mission.id,
        name: mission.name,
        tier: mission.tier,
        cost: mission.cost,
        durationMonths: mission.durationMonths,
        remainingMonths: mission.durationMonths,
        progressPercent: 0,
        startTurn: turn
      };

      country.spaceProgram.activeMissions.push(activeMission);

      window.WorldForge.Core.GameState.addNotification(
        'info',
        'Zainicjowano Program Kosmiczny',
        `Rozpoczęto realizację misji: "${mission.name}". Planowany start za ${mission.durationMonths} miesięcy.`,
        country.id
      );

      return { success: true, data: activeMission };
    },

    processMonthly(state, turnNumber) {
      for (const [countryId, country] of Object.entries(state.countries)) {
        if (!country.spaceProgram?.activeMissions) continue;

        for (let i = country.spaceProgram.activeMissions.length - 1; i >= 0; i--) {
          const m = country.spaceProgram.activeMissions[i];
          m.remainingMonths -= 1;
          const elapsed = m.durationMonths - m.remainingMonths;
          m.progressPercent = Math.min(100, Math.round((elapsed / m.durationMonths) * 100));

          if (m.remainingMonths <= 0) {
            country.spaceProgram.activeMissions.splice(i, 1);
            country.spaceProgram.completedMissions.push(m.id);
            country.spaceProgram.tier = Math.max(country.spaceProgram.tier, m.tier);

            if (m.id === 'mission_lunar_landing') {
              country.spaceProgram.moonLanded = true;
              country.economy.socialApproval = Math.min(99, country.economy.socialApproval + 15);
              if (countryId === state.playerCountryId) {
                window.WorldForge.Core.GameState.addNotification(
                  'success',
                  '🌕 HISTORYCZNE LĄDOWANIE NA KSIĘŻYCU!',
                  `Twoi astronauci postawili stopę na powierzchni Księżyca! Prestiż państwa osiągnął historyczne maksimum.`,
                  countryId
                );
              }
            } else if (m.id === 'mission_space_station') {
              country.research.monthlyPoints += 150;
            } else if (m.id === 'mission_telecom_sat') {
              country.infrastructure.digitalBroadband5GCoverage = Math.min(100, country.infrastructure.digitalBroadband5GCoverage + 12);
            }
          }
        }
      }
    }
  };

  window.WorldForge.Systems.Space = SpaceSystem;
})();
