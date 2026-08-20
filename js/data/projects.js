/**
 * WorldForge: Nations - National Megaprojects Catalog
 * Costs in full exact base units (USD).
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  window.WorldForge.Data.Projects = [
    {
      id: 'proj_cpk',
      name: 'Centralny Port Komunikacyjny (Mega Hub)',
      category: 'transport',
      icon: '✈️',
      totalCost: 18000000000, // 18 mld USD
      monthlyCost: 300000000, // 300 mln USD / m-c
      durationMonths: 60,
      requiredResources: { steel: 50000, machinery: 30000 },
      description: 'Zintegrowany węzeł lotniczy i kolejowy łączący stolicę z siecią szybkich kolei i transportem towarowym.',
      effects: {
        infraTransport: +18,
        gdpGrowthBonus: +0.45,
        exportMultiplier: 1.12,
        maintenanceMonthly: 25000000
      }
    },
    {
      id: 'proj_nuclear_plant',
      name: 'Program Energetyki Jądrowej (3x AP1000/EPR)',
      category: 'energy',
      icon: '⚛️',
      totalCost: 24000000000, // 24 mld USD
      monthlyCost: 350000000,
      durationMonths: 72,
      requiredResources: { steel: 80000, machinery: 60000, energy: 20000 },
      description: 'Budowa wielkoskalowej elektrowni jądrowej gwarantującej stabilną, bezemisyjną energię w podstawie systemu.',
      effects: {
        energyCapacityGW: +6.0,
        cleanEnergyShare: +22,
        energyStability: +25,
        maintenanceMonthly: 30000000
      }
    },
    {
      id: 'proj_semiconductor_fab',
      name: 'Narodowa Mega-Fabryka Półprzewodników (3nm)',
      category: 'high-tech',
      icon: '💾',
      totalCost: 20000000000, // 20 mld USD
      monthlyCost: 400000000,
      durationMonths: 48,
      requiredResources: { electronics: 40000, machinery: 70000, energy: 40000 },
      description: 'Zaawansowana odlewnia chipów uniezależniająca gospodarkę od globalnych wąskich gardeł łańcuchów dostaw.',
      effects: {
        semiconductorOutputMultiplier: 2.5,
        productivityIndex: +12,
        highTechExport: +35,
        maintenanceMonthly: 35000000
      }
    },
    {
      id: 'proj_hsr_corridor',
      name: 'Magistrala Kolei Dużych Prędkości (350 km/h)',
      category: 'transport',
      icon: '🚄',
      totalCost: 14000000000, // 14 mld USD
      monthlyCost: 250000000,
      durationMonths: 54,
      requiredResources: { steel: 60000, energy: 15000 },
      description: 'Nowoczesna sieć kolei dużych prędkości łącząca główne metropolie i aglomeracje przemysłowe.',
      effects: {
        highSpeedRailKm: +850,
        unemployment: -0.4,
        laborMobility: +15,
        maintenanceMonthly: 18000000
      }
    },
    {
      id: 'proj_ai_supercomputing',
      name: 'Suwerenny Klaster AI & Superkomputer Exaflop',
      category: 'digital',
      icon: '🧠',
      totalCost: 9500000000, // 9.5 mld USD
      monthlyCost: 200000000,
      durationMonths: 36,
      requiredResources: { semiconductors: 50000, electronics: 40000, energy: 30000 },
      description: 'Państwowa infrastruktura obliczeniowa dla modeli AI, symulacji medycznych, klimatycznych i kryptografii.',
      effects: {
        researchSpeedBonus: +30,
        taxEfficiency: +4.0,
        digitalization: +18,
        maintenanceMonthly: 15000000
      }
    },
    {
      id: 'proj_offshore_wind',
      name: 'Morskie Farmy Wiatrowe Offshore',
      category: 'energy',
      icon: '🌊',
      totalCost: 12000000000, // 12 mld USD
      monthlyCost: 220000000,
      durationMonths: 48,
      requiredResources: { steel: 45000, machinery: 35000 },
      description: 'Kompleks turbin wiatrowych na szelfie morskim o wysokiej rocznej wietrzności.',
      effects: {
        energyCapacityGW: +4.5,
        cleanEnergyShare: +15,
        co2Reduction: +18,
        maintenanceMonthly: 14000000
      }
    },
    {
      id: 'proj_deepwater_terminal',
      name: 'Głębokowodny Terminal Kontenerowy',
      category: 'trade',
      icon: '🚢',
      totalCost: 6500000000, // 6.5 mld USD
      monthlyCost: 150000000,
      durationMonths: 36,
      requiredResources: { steel: 30000, machinery: 25000 },
      description: 'Rozbudowa portu morskiego o nabrzeża dla największych kontenerowców oceanicznych.',
      effects: {
        seaportsCapacity: +35,
        tariffRevenuesMultiplier: 1.25,
        tradeVolume: +16,
        maintenanceMonthly: 10000000
      }
    },
    {
      id: 'proj_air_defense_shield',
      name: 'Zintegrowana Tarcza Przeciwlotnicza',
      category: 'defense',
      icon: '🛡️',
      totalCost: 16000000000, // 16 mld USD
      monthlyCost: 320000000,
      durationMonths: 48,
      requiredResources: { military_equipment: 50000, electronics: 35000, semiconductors: 30000 },
      description: 'Wielowarstwowy system obrony powietrznej z radarami wczesnego ostrzegania i bateriami rakietowymi.',
      effects: {
        deterrenceScore: +28,
        militaryReadiness: +15,
        politicalStability: +8,
        maintenanceMonthly: 22000000
      }
    }
  ];
})();
