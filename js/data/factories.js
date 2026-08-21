/**
 * WorldForge: Nations - Industrial Plants & Factory Types Catalog
 * Defines industrial facilities available for construction in 16 sectors.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  window.WorldForge.Data.FactoryTypes = [
    {
      id: 'factory_steel_mill',
      name: 'Huta Stali i Walcownia Hutnicza',
      sector: 'steel',
      icon: '🏗️',
      cost: 800000000, // 800 mln USD
      constructionMonths: 12,
      capacityBoost: 5000,
      workersNeeded: 3500,
      inputsRequired: { coal: 50, energy: 40 },
      description: 'Wielki piec hutniczy i walcownia kęsisk stalowych. Podnosi zdolności produkcyjne stali.'
    },
    {
      id: 'factory_semiconductor_fab',
      name: 'Zaawansowana Fabryka Półprzewodników (Fab)',
      sector: 'semiconductors',
      icon: '💾',
      cost: 2500000000, // 2.5 mld USD
      constructionMonths: 18,
      capacityBoost: 3000,
      workersNeeded: 2200,
      inputsRequired: { aluminum: 30, energy: 80, water: 40 },
      description: 'Czysty pokój (cleanroom) i linie litograficzne do produkcji układów scalonych i mikroprocesorów.'
    },
    {
      id: 'factory_pharma_plant',
      name: 'Zakłady Farmaceutyczne i Syntezy Leków',
      sector: 'medicine',
      icon: '💊',
      cost: 650000000, // 650 mln USD
      constructionMonths: 10,
      capacityBoost: 4000,
      workersNeeded: 1800,
      inputsRequired: { energy: 20, water: 20 },
      description: 'Linie formulacji antybiotyków, szczepionek i leków ratujących życie. Poprawia indeks zdrowia.'
    },
    {
      id: 'factory_auto_assembly',
      name: 'Fabryka Samochodów i Pojazdów EV',
      sector: 'vehicles',
      icon: '🚗',
      cost: 1100000000, // 1.1 mld USD
      constructionMonths: 14,
      capacityBoost: 4500,
      workersNeeded: 4500,
      inputsRequired: { steel: 60, aluminum: 30, electronics: 30, energy: 30 },
      description: 'Zrobotyzowane linie montażowe karoserii, baterii i układów napędowych pojazdów.'
    },
    {
      id: 'factory_oil_refinery',
      name: 'Rafineria Ropy Naftowej i Kompleks Petrochemiczny',
      sector: 'fuels',
      icon: '⛽',
      cost: 1800000000, // 1.8 mld USD
      constructionMonths: 16,
      capacityBoost: 6000,
      workersNeeded: 2800,
      inputsRequired: { oil: 110, energy: 30 },
      description: 'Kolumny destylacji frakcyjnej i krakingu ropy naftowej produkujące benzynę i paliwo lotnicze.'
    },
    {
      id: 'factory_machinery_works',
      name: 'Zakłady Budowy Maszyn i Robotów Przemysłowych',
      sector: 'machinery',
      icon: '⚙️',
      cost: 750000000, // 750 mln USD
      constructionMonths: 12,
      capacityBoost: 3500,
      workersNeeded: 3000,
      inputsRequired: { steel: 70, electronics: 30, energy: 40 },
      description: 'Produkcja obrabiarek CNC, turbin gazowych i ramion robotycznych dla nowoczesnych fabryk.'
    },
    {
      id: 'factory_electronics_assembly',
      name: 'Fabryka Elektroniki Użytkowej i Komputerów',
      sector: 'electronics',
      icon: '📱',
      cost: 900000000, // 900 mln USD
      constructionMonths: 12,
      capacityBoost: 5000,
      workersNeeded: 4000,
      inputsRequired: { semiconductors: 40, aluminum: 20, energy: 30 },
      description: 'Montaż płyt głównych, smartfonów, serwerów i urządzeń telekomunikacyjnych.'
    },
    {
      id: 'factory_defense_arsenal',
      name: 'Państwowe Zakłady Zbrojeniowe i Amunicyjne',
      sector: 'military_equipment',
      icon: '🛡️',
      cost: 1400000000, // 1.4 mld USD
      constructionMonths: 15,
      capacityBoost: 3000,
      workersNeeded: 3200,
      inputsRequired: { steel: 80, semiconductors: 50, machinery: 40, energy: 50 },
      description: 'Produkcja pojazdów opancerzonych, pocisków rakietowych i amunicji artyleryjskiej.'
    },
    {
      id: 'factory_agri_greenhouse',
      name: 'Kompleks Szklarniowy i Przetwórstwa Żywności',
      sector: 'food',
      icon: '🌾',
      cost: 450000000, // 450 mln USD
      constructionMonths: 8,
      capacityBoost: 6000,
      workersNeeded: 2500,
      inputsRequired: { water: 50, energy: 20 },
      description: 'Wysokowydajna produkcja rolno-spożywcza i magazyny chłodnicze uniezależniające od pogody.'
    },
    {
      id: 'factory_aluminum_smelter',
      name: 'Huta Aluminium i Metali Lekkich',
      sector: 'aluminum',
      icon: '🔩',
      cost: 850000000, // 850 mln USD
      constructionMonths: 12,
      capacityBoost: 4000,
      workersNeeded: 2000,
      inputsRequired: { energy: 120 },
      description: 'Elektroliza tlenku glinu wytwarzająca lekkie stopy dla lotnictwa i motoryzacji.'
    },

    // ═══════════ KOPALNIE ZŁOTA (produkcja trafia do rezerw państwa, NIE na rynek) ═══════════
    {
      id: 'mine_gold_medium',
      name: 'Średnia Kopalnia Złota (Open-Pit)',
      sector: 'gold_mining',
      icon: '🪙',
      cost: 8000000000, // 8 mld USD
      constructionMonths: 10,
      capacityBoost: 20, // ton rocznie (capacityBoost = t/rok dla kopalń)
      workersNeeded: 2800,
      inputsRequired: { energy: 40, machinery: 15 },
      aiscPerOz: 1900, // koszt całkowity wydobycia uncji
      description: 'Odkrywkowa kopalnia rudy złota ze flotacją. Wydobywa 20 t złota rocznie bezpośrednio do rezerw państwa.',
      isMine: true
    },
    {
      id: 'mine_gold_large',
      name: 'Duża Kopalnia Złota (Muruntau-Scale)',
      sector: 'gold_mining',
      icon: '⛏️',
      cost: 25000000000, // 25 mld USD
      constructionMonths: 16,
      capacityBoost: 50, // ton rocznie
      workersNeeded: 8500,
      inputsRequired: { energy: 90, machinery: 40 },
      aiscPerOz: 1750,
      description: 'Gigantyczny kompleks górniczy klasy uzbeckiego Muruntau. 50 t złota rocznie do skarbca państwa.',
      isMine: true
    },
    {
      id: 'mine_gold_mega',
      name: 'Mega-Dystrykt Górniczy (Nevada-Scale)',
      sector: 'gold_mining',
      icon: '🏔️',
      cost: 50000000000, // 50 mld USD — najdroższa inwestycja w grze
      constructionMonths: 24,
      capacityBoost: 100, // ton rocznie; po 4 modernizacjach (x1.5) ~506 t/rok
      workersNeeded: 22000,
      inputsRequired: { energy: 200, machinery: 90, steel: 60 },
      aiscPerOz: 1600,
      description: 'Konglomerat kopalń klasy Nevada Gold Mines (93 t/rok w realu). Po pełnych modernizacjach do ~500 t złota rocznie.',
      isMine: true
    }
  ];
})();
