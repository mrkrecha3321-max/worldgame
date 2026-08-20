/**
 * WorldForge: Nations - Policies & National Doctrines Catalog
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  window.WorldForge.Data.Policies = [
    {
      id: 'pol_debt_brake',
      name: 'Konstytucyjna Reguła Wydatkowa (Debt Brake)',
      category: 'fiscal',
      icon: '🔒',
      description: 'Ustala sztywny limit deficytu strukturalnego do maksymalnie 0.5% PKB rocznie, chroniąc przed niekontrolowanym długiem.',
      enacted: false,
      effects: {
        creditRatingBoost: 1,
        deficitPenaltyReduction: 0.8,
        socialApprovalPenalty: -3.0
      }
    },
    {
      id: 'pol_innovation_box',
      name: 'Ulga Podatkowa IP Box & B+R (5% CIT dla Innowacji)',
      category: 'tax',
      icon: '💡',
      description: 'Preferencyjne opodatkowanie dochodów z patentów i praw własności intelektualnej.',
      enacted: true,
      effects: {
        fdiAttractiveness: +15,
        researchSpeed: +12,
        citRevenueReduction: -2.0
      }
    },
    {
      id: 'pol_ltv_cap',
      name: 'Nadzór Ostrożnościowy LTV/DSTI dla Kredytów Mieszkaniowych',
      category: 'banking',
      icon: '🏠',
      description: 'Ograniczenie wkładu własnego (maks. 80% LTV) i limit raty do 40% dochodu gospodarstwa, zapobiegając bańce cenowej.',
      enacted: true,
      effects: {
        bubbleRiskReduction: -15,
        nplRiskReduction: -1.2,
        mortgageGrowthClamp: 0.85
      }
    },
    {
      id: 'pol_energy_transition',
      name: 'Pakiet Transformacji Energetycznej i Fundusz OZE',
      category: 'energy',
      icon: '🌱',
      description: 'Gwarantowane taryfy odkupu energii ze źródeł odnawialnych i subsydia do termomodernizacji.',
      enacted: false,
      effects: {
        cleanEnergyGrowth: +2.5,
        subsidiesBudgetIncrease: +1.5,
        carbonEmissionsReduction: -3.0
      }
    },
    {
      id: 'pol_export_guarantees',
      name: 'Rządowa Agencja Ubezpieczeń Kredytów Eksportowych',
      category: 'trade',
      icon: '🌐',
      description: 'Gwarancje skarbu państwa dla rodzimych przedsiębiorstw wchodzących na rynki wschodzące i azjatyckie.',
      enacted: true,
      effects: {
        exportVolumeBonus: +8,
        businessConfidence: +4
      }
    },
    {
      id: 'pol_family_capital',
      name: 'Program Wsparcia Rodzin i Bon Wychowawczy',
      category: 'social',
      icon: '👶',
      description: 'Comiesięczne świadczenie na każde dziecko mające na celu przeciwdziałanie kryzysowi demograficznemu.',
      enacted: true,
      effects: {
        birthRateBonus: +0.15,
        socialApproval: +8.0,
        socialWelfareCostIncrease: +4.0
      }
    }
  ];
})();
