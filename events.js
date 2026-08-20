/**
 * WorldForge: Nations - Events & Crisis Scenarios Catalog
 * Exact full base numerical costs.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  window.WorldForge.Data.Events = [
    {
      id: 'evt_global_recession',
      title: 'Globalna Recesja Gospodarcza',
      category: 'macro',
      icon: '📉',
      isGlobal: true,
      triggerCondition: (country, state) => state.time.currentTurn % 18 === 0 && Math.random() < 0.35,
      description: 'Spowolnienie u głównych partnerów handlowych wywołuje spadek popytu na rynkach światowych. Zamówienia przemysłowe gwałtownie topnieją.',
      choices: [
        {
          text: 'Uruchom pakiet stymulacyjny (zwiększ wydatki infrastrukturalne o 5 mld USD)',
          cost: 5000000000,
          effects: { gdpGrowthChange: +0.6, treasuryChange: -5000000000, approvalChange: +4 }
        },
        {
          text: 'Wprowadź dyscyplinę budżetową i chroń rezerwy skarbu',
          cost: 0,
          effects: { gdpGrowthChange: -1.2, unemploymentChange: +0.8, approvalChange: -6 }
        }
      ]
    },
    {
      id: 'evt_banking_panic',
      title: 'Kryzys Płynności w Sektorze Bankowym',
      category: 'banking',
      icon: '🏦',
      isGlobal: false,
      triggerCondition: (country) => country.commercialBanks.some(b => b.carSolvencyRatio < 10.5 || b.nplRatio > 9.0),
      description: 'Jeden z czołowych banków komercyjnych odnotował odpływ depozytów po ujawnieniu strat z portfela kredytów zagrożonych.',
      choices: [
        {
          text: 'Udziel natychmiastowej linii płynnościowej ELA (1 mld USD)',
          cost: 1000000000,
          effects: { treasuryChange: -1000000000, bankStabilityChange: +25, inflationChange: +0.4 }
        },
        {
          text: 'Przeprowadź przymusową restrukturyzację (Bail-in)',
          cost: 200000000,
          effects: { treasuryChange: -200000000, approvalChange: -5, businessConfidenceChange: -8 }
        }
      ]
    },
    {
      id: 'evt_energy_shock',
      title: 'Szok Cenowy na Rynku Surowców Energetycznych',
      category: 'energy',
      icon: '⚡',
      isGlobal: true,
      triggerCondition: (country, state) => state.time.currentTurn % 14 === 4 && Math.random() < 0.3,
      description: 'Napięcia geopolityczne wywindowały światowe ceny ropy i gazu o ponad 35%.',
      choices: [
        {
          text: 'Wprowadź rządową tarczę osłonową i zamroź ceny dla odbiorców (600 mln USD)',
          cost: 600000000,
          effects: { treasuryChange: -600000000, inflationChange: -1.2, approvalChange: +7 }
        },
        {
          text: 'Przerzuć koszty na rynek i przyspiesz inwestycje w OZE/atom',
          cost: 0,
          effects: { inflationChange: +1.8, gdpGrowthChange: -0.5, approvalChange: -8 }
        }
      ]
    },
    {
      id: 'evt_cyber_attack',
      title: 'Zmasowany Cyberatak na Infrastrukturę Krytyczną',
      category: 'security',
      icon: '👾',
      isGlobal: false,
      triggerCondition: (country, state) => state.time.currentTurn > 3 && Math.random() < 0.15,
      description: 'Wrogie grupy zaatakowały systemy bankowości elektronicznej i sterowniki sieci elektroenergetycznej.',
      choices: [
        {
          text: 'Uruchom zespoły CSIRT i procedury izolacji kwantowej',
          effects: { gridReliabilityPenalty: -2, cyberDefenseReadiness: +10 }
        },
        {
          text: 'Natychmiast sfinansuj Narodowe Centrum Cyberbezpieczeństwa (300 mln USD)',
          cost: 300000000,
          effects: { treasuryChange: -300000000, cyberDefenseReadiness: +25, politicalStabilityChange: +5 }
        }
      ]
    },
    {
      id: 'evt_foreign_arms_deal',
      title: 'Oferta Zakupu Myśliwców Wielozadaniowych 5. Generacji',
      category: 'defense',
      icon: '✈️',
      isGlobal: false,
      triggerCondition: (country) => country.military.deterrenceScore < 60 && country.treasury > 1200000000,
      description: 'Sojuszniczy rząd oferuje dostawę eskadry nowoczesnych samolotów z transferem technologii serwisowej.',
      choices: [
        {
          text: 'Podpisz kontrakt zbrojeniowy (1.2 mld USD z offsetem przemysłowym)',
          cost: 1200000000,
          effects: { treasuryChange: -1200000000, deterrenceScoreChange: +18, airForceReadiness: +22 }
        },
        {
          text: 'Odrzuć ofertę i skup się na modernizacji wojsk lądowych i dronów',
          effects: { approvalChange: +1 }
        }
      ]
    }
  ];
})();
