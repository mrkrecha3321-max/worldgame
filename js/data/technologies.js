/**
 * WorldForge: Nations - Research & Technology Tree Catalog
 * 10 research branches with prerequisites, research point costs and real systemic modifiers.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  window.WorldForge.Data.Technologies = [
    // === Branch 1: Macroeconomics & Governance ===
    {
      id: 'tech_macro_analytics',
      name: 'Ekonometria w Czasie Rzeczywistym',
      branch: 'economics',
      branchName: 'Makroekonomia',
      icon: '📊',
      costPoints: 1200,
      estimatedMonths: 6,
      prerequisites: [],
      description: 'Zastosowanie wielkich zbiorów danych transakcyjnych do natychmiastowego monitoringu PKB i inflacji.',
      effects: { taxEfficiency: +1.5, gdpForecastAccuracy: +20 }
    },
    {
      id: 'tech_algorithmic_fiscal',
      name: 'Algorytmiczne Uszczelnianie Podatkowe',
      branch: 'economics',
      branchName: 'Makroekonomia',
      icon: '🤖',
      costPoints: 2400,
      estimatedMonths: 9,
      prerequisites: ['tech_macro_analytics'],
      description: 'Samouczące się modele wykrywające karuzele VAT i unikanie opodatkowania w czasie rzeczywistym.',
      effects: { taxEfficiency: +4.0, greyEconomyReduction: -2.5, vatRevenueMultiplier: 1.05 }
    },
    {
      id: 'tech_sovereign_wealth_fund',
      name: 'Architektura Państwowych Funduszy Majątkowych',
      branch: 'economics',
      branchName: 'Makroekonomia',
      icon: '🏛️',
      costPoints: 3600,
      estimatedMonths: 12,
      prerequisites: ['tech_algorithmic_fiscal'],
      description: 'Optymalizacja portfela rezerw strategicznych i pasywnego dochodu z aktywów zagranicznych.',
      effects: { treasuryReturnRate: +0.8, creditRatingBonus: 1 }
    },

    // === Branch 2: Modern Banking & FinTech ===
    {
      id: 'tech_adv_banking_1',
      name: 'Zintegrowany Nadzór Ostrożnościowy (Basel IV)',
      branch: 'banking',
      branchName: 'Bankowość i Finanse',
      icon: '🏦',
      costPoints: 1000,
      estimatedMonths: 5,
      prerequisites: [],
      description: 'Standardy adekwatności kapitałowej ograniczające ryzyko upadłości komercyjnych banków.',
      effects: { bankStabilityBonus: +10, nplReduction: -0.5 }
    },
    {
      id: 'tech_cbdc',
      name: 'Cyfrowa Waluta Banku Centralnego (CBDC)',
      branch: 'banking',
      branchName: 'Bankowość i Finanse',
      icon: '💳',
      costPoints: 2800,
      estimatedMonths: 10,
      prerequisites: ['tech_adv_banking_1'],
      description: 'Programowalny pieniądz cyfrowy ułatwiający bezpośrednie transfery socjalne i eliminujący pośredników.',
      effects: { greyEconomyReduction: -3.5, transactionCostReduction: 0.85, monetaryVelocity: +12 }
    },
    {
      id: 'tech_ai_credit_scoring',
      name: 'Kvantowy Scoring Kredytowy AI',
      branch: 'banking',
      branchName: 'Bankowość i Finanse',
      icon: '📉',
      costPoints: 3400,
      estimatedMonths: 11,
      prerequisites: ['tech_cbdc'],
      description: 'Precyzyjne modele szacowania ryzyka niewypłacalności przedsiębiorstw i kredytobiorców hipotecznych.',
      effects: { defaultRateReduction: -2.0, corporateLendingEfficiency: +15 }
    },

    // === Branch 3: Energy & Clean Power ===
    {
      id: 'tech_power_grid_1',
      name: 'Inteligentne Sieci Przesyłowe (Smart Grid)',
      branch: 'energy',
      branchName: 'Energetyka',
      icon: '⚡',
      costPoints: 1400,
      estimatedMonths: 6,
      prerequisites: [],
      description: 'Zarządzanie popytem i rozpływem mocy zmniejszające straty sieciowe.',
      effects: { gridLossReduction: -2.0, blackoutRiskReduction: -1.0 }
    },
    {
      id: 'tech_smr_nuclear',
      name: 'Modułowe Reaktory Jądrowe (SMR 300MW)',
      branch: 'energy',
      branchName: 'Energetyka',
      icon: '⚛️',
      costPoints: 4200,
      estimatedMonths: 14,
      prerequisites: ['tech_power_grid_1'],
      description: 'Szybkie w budowie, bezpieczne małe reaktory jądrowe zasilające lokalne klastry przemysłowe.',
      effects: { nuclearCostReduction: 0.75, cleanEnergyShare: +10, energyOutputMultiplier: 1.15 }
    },
    {
      id: 'tech_perovskite_solar',
      name: 'Wysokosprawne Ogniwa Perowskitowe i Magazyny Żelazowe',
      branch: 'energy',
      branchName: 'Energetyka',
      icon: '☀️',
      costPoints: 3100,
      estimatedMonths: 10,
      prerequisites: ['tech_power_grid_1'],
      description: 'Nowa generacja elastycznych paneli słonecznych o sprawności powyżej 32% i tani bilans magazynowy.',
      effects: { solarOutputMultiplier: 1.45, storageEfficiency: +35 }
    },

    // === Branch 4: Smart Transport & Logistics ===
    {
      id: 'tech_intermodal_logistics',
      name: 'Autonomiczna Logistyka Intermodalna',
      branch: 'transport',
      branchName: 'Transport i Logistyka',
      icon: '🚛',
      costPoints: 1800,
      estimatedMonths: 7,
      prerequisites: [],
      description: 'Automatyczne przeładunki w suchych portach i optymalizacja tras pociągów towarowych.',
      effects: { exportCapacityBonus: +12, transportCostReduction: 0.90 }
    },
    {
      id: 'tech_maglev_propulsion',
      name: 'Magnetyczna Kolej Dużych Prędkości (Maglev)',
      branch: 'transport',
      branchName: 'Transport i Logistyka',
      icon: '🚄',
      costPoints: 4800,
      estimatedMonths: 15,
      prerequisites: ['tech_intermodal_logistics'],
      description: 'Pociągi lewitujące na poduszce magnetycznej osiągające prędkości powyżej 500 km/h.',
      effects: { highSpeedRailKmMultiplier: 1.3, businessProductivityBonus: +8 }
    },

    // === Branch 5: Advanced Industry & Automation ===
    {
      id: 'tech_basic_automation',
      name: 'Przemysł 4.0 i Robotyka Przemysłowa',
      branch: 'industry',
      branchName: 'Przemysł i Surowce',
      icon: '🦾',
      costPoints: 1500,
      estimatedMonths: 6,
      prerequisites: [],
      description: 'Wdrożenie ramion robotycznych, automatycznych spawarek i montażowni w fabrykach.',
      effects: { productivityIndex: +7.0, manufacturingCostReduction: 0.92 }
    },
    {
      id: 'tech_circular_metallurgy',
      name: 'Bezemisyjna Metalurgia Wodorowa i Recykling Metali',
      branch: 'industry',
      branchName: 'Przemysł i Surowce',
      icon: '🏭',
      costPoints: 3300,
      estimatedMonths: 11,
      prerequisites: ['tech_basic_automation'],
      description: 'Redukcja rudy żelaza zielonym wodorem zastępującym węgiel koksowy.',
      effects: { steelProductionMultiplier: 1.25, industrialEmissions: -20 }
    },
    {
      id: 'tech_additive_manufacturing',
      name: 'Wielkogabarytowy Druk 3D Komponentów Lotniczych',
      branch: 'industry',
      branchName: 'Przemysł i Surowce',
      icon: '🖨️',
      costPoints: 3700,
      estimatedMonths: 12,
      prerequisites: ['tech_basic_automation'],
      description: 'Wytwarzanie części z proszków tytanu i superstopów bez konieczności skomplikowanej obróbki skrawaniem.',
      effects: { machineryOutputMultiplier: 1.30, militaryCostDiscount: 0.92 }
    },

    // === Branch 6: Digitalization, Semiconductors & AI ===
    {
      id: 'tech_euv_lithography',
      name: 'Zaawansowana Litografia EUV (Poniżej 2nm)',
      branch: 'digital',
      branchName: 'Cyfryzacja i AI',
      icon: '💾',
      costPoints: 5000,
      estimatedMonths: 16,
      prerequisites: [],
      description: 'Opanowanie technologii naświetlania promieniami ekstremalnego ultrafioletu do produkcji najgęstszych chipów.',
      effects: { semiconductorOutputMultiplier: 1.8, highTechExportBonus: +25 }
    },
    {
      id: 'tech_autonomous_agents',
      name: 'Autonomiczne Agenty Gospodarcze i Prawne AI',
      branch: 'digital',
      branchName: 'Cyfryzacja i AI',
      icon: '🧠',
      costPoints: 3900,
      estimatedMonths: 13,
      prerequisites: ['tech_euv_lithography'],
      description: 'Systemy sztucznej inteligencji prowadzące audyty korporacyjne, optymalizację umów i procesy biurokratyczne.',
      effects: { adminEfficiency: +20, laborProductivity: +9.5 }
    },
    {
      id: 'tech_quantum_encryption',
      name: 'Kwantowa Dystrybucja Klucza i Odporność Kryptograficzna',
      branch: 'digital',
      branchName: 'Cyfryzacja i AI',
      icon: '🔐',
      costPoints: 4600,
      estimatedMonths: 14,
      prerequisites: ['tech_autonomous_agents'],
      description: 'Niewrażliwa na podsłuch infrastruktura światłowodowa chroniąca finanse i wojsko.',
      effects: { cyberDefenseBonus: +35, bankSecurityScore: +20 }
    },

    // === Branch 7: Biotechnology & Medicine ===
    {
      id: 'tech_mrna_therapeutics',
      name: 'Platformy Terapeutyczne mRNA i Onkologia Celowana',
      branch: 'biotech',
      branchName: 'Medycyna i Biotechnologia',
      icon: '🧬',
      costPoints: 2600,
      estimatedMonths: 9,
      prerequisites: [],
      description: 'Szybka synteza leków przeciwnowotworowych i szczepionek dostosowanych do kodu genetycznego pacjenta.',
      effects: { lifeExpectancy: +1.5, healthcareQuality: +12, medicineExportMultiplier: 1.3 }
    },
    {
      id: 'tech_bio_nanotech',
      name: 'Bionanotechnologia i Narządy z Biodruku',
      branch: 'biotech',
      branchName: 'Medycyna i Biotechnologia',
      icon: '💊',
      costPoints: 4400,
      estimatedMonths: 14,
      prerequisites: ['tech_mrna_therapeutics'],
      description: 'Wytwarzanie tkanek i komórkowych implantów zastępujących przeszczepy.',
      effects: { workingAgeHealthBonus: +15, mortalityRateReduction: -1.0 }
    },

    // === Branch 8: Modern Agriculture & Food Security ===
    {
      id: 'tech_precision_agritech',
      name: 'Rolnictwo Precyzyjne i Monitoring Dronowy',
      branch: 'agriculture',
      branchName: 'Rolnictwo i Żywność',
      icon: '🌾',
      costPoints: 1300,
      estimatedMonths: 6,
      prerequisites: [],
      description: 'Autonomiczne ciągniki i dawkowanie nawozów oparte na mapowaniu wilgotności gleby z satelitów.',
      effects: { foodYieldMultiplier: 1.25, waterConsumptionReduction: 0.80 }
    },
    {
      id: 'tech_vertical_farming',
      name: 'Miejskie Farmy Pionowe i Hodowla Hydroponiczna',
      branch: 'agriculture',
      branchName: 'Rolnictwo i Żywność',
      icon: '🥬',
      costPoints: 2900,
      estimatedMonths: 10,
      prerequisites: ['tech_precision_agritech'],
      description: 'Produkcja warzyw i białka w zamkniętych komorach LED bez wpływu zmian klimatycznych.',
      effects: { foodSecurityIndex: +30, landUseReduction: 0.70 }
    },

    // === Branch 9: Defense Technologies ===
    {
      id: 'tech_hypersonic_glide',
      name: 'Szybujące Pociski Hipersoniczne i Radary Kwantowe',
      branch: 'defense',
      branchName: 'Technologie Obronne',
      icon: '🚀',
      costPoints: 5200,
      estimatedMonths: 16,
      prerequisites: [],
      description: 'Pociski manewrujące z prędkością powyżej Mach 6 omijające konwencjonalne systemy obrony.',
      effects: { deterrenceScore: +35, militaryReadiness: +15 }
    },
    {
      id: 'tech_autonomous_swarm',
      name: 'Rój Bezzałogowych Dronów Powietrznych i Morskich',
      branch: 'defense',
      branchName: 'Technologie Obronne',
      icon: '🛸',
      costPoints: 3800,
      estimatedMonths: 12,
      prerequisites: ['tech_hypersonic_glide'],
      description: 'Skoordynowane algorytmicznie roje rozpoznawczo-uderzeniowe o wysokiej odporności na zakłócenia walki WRE.',
      effects: { militaryEquipmentEfficiency: 1.4, personnelCasualtyReduction: 0.75 }
    },
    {
      id: 'tech_laser_air_defense',
      name: 'Wysokoenergetyczna Broń Laserowa i Mikrofalowa (DEW)',
      branch: 'defense',
      branchName: 'Technologie Obronne',
      icon: '⚡',
      costPoints: 4900,
      estimatedMonths: 15,
      prerequisites: ['tech_autonomous_swarm'],
      description: 'Koszt zestrzelenia drona lub rakiety zredukowany do kilku dolarów za impuls energetyczny.',
      effects: { airDefenseReadiness: +40, ammoMaintenanceDiscount: 0.70 }
    },

    // === Branch 10: Aerospace & Space ===
    {
      id: 'tech_reusable_heavy_rocketry',
      name: 'Wielorazowe Rakiety Nośne Ciężkiego Udźwigu',
      branch: 'space',
      branchName: 'Sektor Kosmiczny',
      icon: '🛰️',
      costPoints: 4500,
      estimatedMonths: 14,
      prerequisites: [],
      description: 'Lądowanie pierwszych stopni rakiet i wielokrotne wykorzystanie silników rakietowych.',
      effects: { launchCostReduction: 0.25, spaceAccessIndex: +50 }
    },
    {
      id: 'tech_orbital_manufacturing',
      name: 'Orbitalna Produkcja Kryształów i Super-Stopów w Mikrograwitacji',
      branch: 'space',
      branchName: 'Sektor Kosmiczny',
      icon: '🌌',
      costPoints: 5800,
      estimatedMonths: 18,
      prerequisites: ['tech_reusable_heavy_rocketry'],
      description: 'Niezwykle czyste światłowody fluorozirkanowe (ZBLAN) i monokryształy wytwarzane na stacji orbitalnej.',
      effects: { highTechProductivity: +20, globalPrestige: +15 }
    }
  ];
})();
