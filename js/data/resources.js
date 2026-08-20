/**
 * WorldForge: Nations - Resources & Commodities Catalog
 * Defines 16 fundamental resources and strategic goods in the global economy.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  window.WorldForge.Data.Resources = [
    {
      id: 'food',
      name: 'Żywność',
      nameEn: 'Food & Agriculture',
      category: 'agriculture',
      icon: '🌾',
      basePrice: 120, // USD per unit
      unit: 'tys. ton',
      inputs: { water: 0.5, energy: 0.2 },
      description: 'Podstawowe artykuły rolno-spożywcze. Niedobór wywołuje gwałtowny spadek zadowolenia i wzrost inflacji.'
    },
    {
      id: 'water',
      name: 'Woda i Retencja',
      nameEn: 'Water & Utilities',
      category: 'utilities',
      icon: '💧',
      basePrice: 45,
      unit: 'mln m³',
      inputs: { energy: 0.3 },
      description: 'Zasoby słodkiej wody dla przemysłu, rolnictwa i ludności. Kluczowe dla bezpieczeństwa biologicznego.'
    },
    {
      id: 'energy',
      name: 'Energia Elektryczna',
      nameEn: 'Electricity',
      category: 'energy',
      icon: '⚡',
      basePrice: 95,
      unit: 'GWh',
      inputs: { coal: 0.3, gas: 0.3, oil: 0.1 },
      description: 'Prąd zasilający zakłady przemysłowe, miasta i serwerownie. Niedobór paraliżuje całą gospodarkę.'
    },
    {
      id: 'coal',
      name: 'Węgiel',
      nameEn: 'Coal',
      category: 'raw',
      icon: '⛏️',
      basePrice: 85,
      unit: 'tys. ton',
      inputs: { energy: 0.1 },
      description: 'Węgiel energetyczny i koksowy. Wykorzystywany w tradycyjnej energetyce oraz hutnictwie stali.'
    },
    {
      id: 'oil',
      name: 'Ropa Naftowa',
      nameEn: 'Crude Oil',
      category: 'raw',
      icon: '🛢️',
      basePrice: 75, // USD/barrel eq
      unit: 'tys. baryłek',
      inputs: { energy: 0.1 },
      description: 'Kluczowy surowiec globalny. Baza dla paliw, tworzyw sztucznych i przemysłu chemicznego.'
    },
    {
      id: 'gas',
      name: 'Gaz Ziemny',
      nameEn: 'Natural Gas',
      category: 'raw',
      icon: '🔥',
      basePrice: 65,
      unit: 'mln m³',
      inputs: { energy: 0.05 },
      description: 'Błękitne paliwo dla elektrociepłowni, hutnictwa oraz przemysłu nawozowego.'
    },
    {
      id: 'fuels',
      name: 'Paliwa Rafinowane',
      nameEn: 'Refined Fuels',
      category: 'processed',
      icon: '⛽',
      basePrice: 140,
      unit: 'tys. ton',
      inputs: { oil: 1.1, energy: 0.3 },
      description: 'Benzyna, diesel i paliwo lotnicze. Niezbędne dla transportu kołowego, kolejowego i lotnictwa.'
    },
    {
      id: 'steel',
      name: 'Stal i Hutnictwo',
      nameEn: 'Steel',
      category: 'materials',
      icon: '🏗️',
      basePrice: 180,
      unit: 'tys. ton',
      inputs: { coal: 0.5, energy: 0.6 },
      description: 'Główny materiał konstrukcyjny dla budownictwa, przemysłu maszynowego i obronnego.'
    },
    {
      id: 'aluminum',
      name: 'Aluminium i Metale',
      nameEn: 'Aluminum & Light Metals',
      category: 'materials',
      icon: '🔩',
      basePrice: 220,
      unit: 'tys. ton',
      inputs: { energy: 1.2 },
      description: 'Lekkie stopy metali kluczowe dla motoryzacji, lotnictwa i nowoczesnej elektroniki.'
    },
    {
      id: 'electronics',
      name: 'Elektronika Użytkowa',
      nameEn: 'Consumer Electronics',
      category: 'tech',
      icon: '📱',
      basePrice: 380,
      unit: 'tys. szt.',
      inputs: { semiconductors: 0.4, aluminum: 0.2, energy: 0.3 },
      description: 'Sprzęt komputerowy, telefony i systemy automatyki domowej i biurowej.'
    },
    {
      id: 'semiconductors',
      name: 'Półprzewodniki i Chipy',
      nameEn: 'Semiconductors',
      category: 'high-tech',
      icon: '💾',
      basePrice: 650,
      unit: 'tys. waflów',
      inputs: { aluminum: 0.3, energy: 0.8, water: 0.4 },
      description: 'Mikroprocesory i układy scalone stanowiące serce nowoczesnej gospodarki cyfrowej i zbrojeniowej.'
    },
    {
      id: 'machinery',
      name: 'Maszyny Przemysłowe',
      nameEn: 'Industrial Machinery',
      category: 'industrial',
      icon: '⚙️',
      basePrice: 420,
      unit: 'jednostek',
      inputs: { steel: 0.7, electronics: 0.3, energy: 0.4 },
      description: 'Obrabiarki CNC, roboty przemysłowe i turbiny. Zwiększają produktywność pracy fabryk.'
    },
    {
      id: 'vehicles',
      name: 'Pojazdy i Motoryzacja',
      nameEn: 'Automotive & Vehicles',
      category: 'industrial',
      icon: '🚗',
      basePrice: 310,
      unit: 'tys. pojazdów',
      inputs: { steel: 0.6, aluminum: 0.3, electronics: 0.3, energy: 0.3 },
      description: 'Samochody osobowe, ciężarówki i autobusy. Kluczowy sektor eksportowy wielu państw.'
    },
    {
      id: 'medicine',
      name: 'Leki i Farmacja',
      nameEn: 'Pharmaceuticals',
      category: 'pharma',
      icon: '💊',
      basePrice: 480,
      unit: 'tys. opakowań',
      inputs: { energy: 0.2, water: 0.2 },
      description: 'Antybiotyki, szczepionki i wyroby medyczne. Bezpośrednio podnoszą jakość ochrony zdrowia.'
    },
    {
      id: 'consumer_goods',
      name: 'Dobra Konsumpcyjne',
      nameEn: 'Consumer Goods',
      category: 'consumer',
      icon: '🛍️',
      basePrice: 190,
      unit: 'tys. ton',
      inputs: { fuels: 0.2, energy: 0.3, aluminum: 0.1 },
      description: 'Artykuły gospodarstwa domowego, odzież i kosmetyki. Wyznacznik standardu życia ludności.'
    },
    {
      id: 'military_equipment',
      name: 'Wyposażenie Wojskowe',
      nameEn: 'Military Equipment',
      category: 'defense',
      icon: '🛡️',
      basePrice: 850,
      unit: 'zestawów',
      inputs: { steel: 0.8, semiconductors: 0.5, machinery: 0.4, energy: 0.5 },
      description: 'Amunicja, pojazdy opancerzone, radary i systemy rakietowe budujące wskaźnik odstraszania.'
    }
  ];
})();
