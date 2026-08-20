/**
 * WorldForge: Nations - Global Stock & Commodities Exchange Data
 * Defines 20+ listed global corporations and strategic commodities/metals.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  window.WorldForge.Data.Exchange = {
    // Strategic Commodities & Precious Metals
    commodities: [
      {
        id: 'gold',
        name: 'Złoto Inwestycyjne (Gold)',
        category: 'precious_metals',
        icon: '🥇',
        unit: 'uncja (oz)',
        basePrice: 2450.0, // USD / oz
        currentPrice: 2450.0,
        priceHistory: [2410, 2425, 2440, 2450],
        volatility: 0.025,
        description: 'Globalna bezpieczna przystań i tarcza antyinflacyjna. Zwiększa rating państwa i stabilność rezerw walutowych.'
      },
      {
        id: 'silver',
        name: 'Srebro Przemysłowe (Silver)',
        category: 'precious_metals',
        icon: '🥈',
        unit: 'uncja (oz)',
        basePrice: 29.5,
        currentPrice: 29.5,
        priceHistory: [28.5, 28.9, 29.2, 29.5],
        volatility: 0.035,
        description: 'Kruszec o kluczowym znaczeniu dla fotowoltaiki, elektroniki i zaawansowanego przemysłu.'
      },
      {
        id: 'crude_oil_brent',
        name: 'Ropa Naftowa Brent (Crude Oil)',
        category: 'energy',
        icon: '🛢️',
        unit: 'baryłka (bbl)',
        basePrice: 78.0,
        currentPrice: 78.0,
        priceHistory: [82.0, 80.5, 79.0, 78.0],
        volatility: 0.045,
        description: 'Podstawowy wskaźnik cen energii i surowców na rynkach światowych.'
      },
      {
        id: 'natural_gas_ttf',
        name: 'Gaz Ziemny TTF (Natural Gas)',
        category: 'energy',
        icon: '🔥',
        unit: 'MWh',
        basePrice: 36.0,
        currentPrice: 36.0,
        priceHistory: [38.0, 37.2, 36.5, 36.0],
        volatility: 0.055,
        description: 'Kluczowe paliwo dla elektrociepłowni, hutnictwa i przemysłu nawozowego.'
      },
      {
        id: 'copper',
        name: 'Miedź Katodowa (Copper LME)',
        category: 'industrial_metals',
        icon: '🥉',
        unit: 'tona',
        basePrice: 9400.0,
        currentPrice: 9400.0,
        priceHistory: [9200, 9310, 9380, 9400],
        volatility: 0.030,
        description: 'Puls gospodarki światowej, niezbędny dla sieci elektroenergetycznych i pojazdów EV.'
      },
      {
        id: 'lithium',
        name: 'Węglan Litu (Lithium Carbonate)',
        category: 'strategic_metals',
        icon: '🔋',
        unit: 'tona',
        basePrice: 14500.0,
        currentPrice: 14500.0,
        priceHistory: [15200, 14900, 14700, 14500],
        volatility: 0.060,
        description: 'Białe złoto transformacji energetycznej, klucz do baterii litowo-jonowych.'
      },
      {
        id: 'wheat_cbot',
        name: 'Pszenica Konsumpcyjna (Wheat)',
        category: 'agriculture',
        icon: '🌾',
        unit: 'tona',
        basePrice: 220.0,
        currentPrice: 220.0,
        priceHistory: [215, 218, 222, 220],
        volatility: 0.035,
        description: 'Podstawowe zboże żywnościowe gwarantujące bezpieczeństwo biologiczne ludności.'
      },
      {
        id: 'wafers_3nm',
        name: 'Krzemowe Wafle 3nm (Semiconductors)',
        category: 'high_tech',
        icon: '💾',
        unit: 'wafer',
        basePrice: 18500.0,
        currentPrice: 18500.0,
        priceHistory: [17800, 18100, 18350, 18500],
        volatility: 0.040,
        description: 'Najbardziej zaawansowane chipy litograficzne napędzające centra danych i modele AI.'
      }
    ],

    // Global Listed Public Corporations (Equities)
    stocks: [
      {
        ticker: 'PKN',
        name: 'ORLEN S.A.',
        countryId: 'POL',
        sector: 'energy',
        icon: '🦅',
        sharePrice: 65.4, // USD eq
        sharesTotal: 1160000000,
        peRatio: 6.8,
        dividendYield: 6.5, // %
        priceHistory: [62.1, 63.5, 64.8, 65.4],
        description: 'Multienergetyczny koncern naftowo-gazowy i lider rafinerii w Europie Środkowej.'
      },
      {
        ticker: 'KGH',
        name: 'KGHM Polska Miedź',
        countryId: 'POL',
        sector: 'materials',
        icon: '⛏️',
        sharePrice: 32.8,
        sharesTotal: 200000000,
        peRatio: 9.2,
        dividendYield: 4.2,
        priceHistory: [30.5, 31.2, 32.0, 32.8],
        description: 'Jeden z największych na świecie producentów miedzi i srebra rafinowanego.'
      },
      {
        ticker: 'PKO',
        name: 'PKO Bank Polski',
        countryId: 'POL',
        sector: 'finance',
        icon: '🏦',
        sharePrice: 14.5,
        sharesTotal: 1250000000,
        peRatio: 7.5,
        dividendYield: 7.8,
        priceHistory: [13.8, 14.1, 14.3, 14.5],
        description: 'Lider polskiego sektora bankowego z największą sumą bilansową w regionie.'
      },
      {
        ticker: 'LMT',
        name: 'Lockheed Martin Corp',
        countryId: 'USA',
        sector: 'defense',
        icon: '🚀',
        sharePrice: 465.0,
        sharesTotal: 245000000,
        peRatio: 16.5,
        dividendYield: 2.8,
        priceHistory: [445.0, 452.0, 460.0, 465.0],
        description: 'Światowy gigant zbrojeniowy, producent myśliwców F-35 i systemów rakietowych HIMARS.'
      },
      {
        ticker: 'NVDA',
        name: 'NVIDIA Corporation',
        countryId: 'USA',
        sector: 'tech',
        icon: '🧠',
        sharePrice: 128.0,
        sharesTotal: 24500000000,
        peRatio: 42.0,
        dividendYield: 0.2,
        priceHistory: [115.0, 122.0, 125.0, 128.0],
        description: 'Monopolista procesorów graficznych GPU i akceleratorów głębokich sieci neuronowych AI.'
      },
      {
        ticker: 'ARMCO',
        name: 'Saudi Aramco',
        countryId: 'SAU',
        sector: 'energy',
        icon: '🛢️',
        sharePrice: 7.8,
        sharesTotal: 242000000000,
        peRatio: 14.2,
        dividendYield: 6.8,
        priceHistory: [7.6, 7.7, 7.75, 7.8],
        description: 'Najbardziej dochodowe przedsiębiorstwo naftowe na świecie z gigantycznymi dywidendami.'
      },
      {
        ticker: 'TSMC',
        name: 'Taiwan Semiconductor (TSMC)',
        countryId: 'TWN',
        sector: 'tech',
        icon: '💾',
        sharePrice: 175.0,
        sharesTotal: 5180000000,
        peRatio: 26.0,
        dividendYield: 1.5,
        priceHistory: [162.0, 168.0, 171.0, 175.0],
        description: 'Odlewnia produkująca ponad 90% najbardziej zaawansowanych chipów krzemowych świata.'
      },
      {
        ticker: 'RHM',
        name: 'Rheinmetall AG',
        countryId: 'DEU',
        sector: 'defense',
        icon: '🛡️',
        sharePrice: 510.0,
        sharesTotal: 43500000,
        peRatio: 24.5,
        dividendYield: 1.2,
        priceHistory: [460.0, 485.0, 498.0, 510.0],
        description: 'Niemiecki lider amunicji 155mm, czołgów Panther i systemów obrony powietrznej Skynex.'
      },
      {
        ticker: 'ASML',
        name: 'ASML Holding N.V.',
        countryId: 'NLD',
        sector: 'tech',
        icon: '🔬',
        sharePrice: 850.0,
        sharesTotal: 395000000,
        peRatio: 38.0,
        dividendYield: 0.9,
        priceHistory: [810.0, 830.0, 842.0, 850.0],
        description: 'Jedyny na świecie producent maszyn litograficznych Extreme Ultraviolet (EUV).'
      },
      {
        ticker: 'TM',
        name: 'Toyota Motor Corp',
        countryId: 'JPN',
        sector: 'auto',
        icon: '🚗',
        sharePrice: 195.0,
        sharesTotal: 1350000000,
        peRatio: 9.8,
        dividendYield: 3.2,
        priceHistory: [188.0, 191.0, 193.0, 195.0],
        description: 'Największy producent samochodów na świecie z dominacją w napędach hybrydowych.'
      },
      {
        ticker: 'PFE',
        name: 'Pfizer Inc.',
        countryId: 'USA',
        sector: 'pharma',
        icon: '💊',
        sharePrice: 28.5,
        sharesTotal: 5650000000,
        peRatio: 12.4,
        dividendYield: 5.8,
        priceHistory: [27.8, 28.1, 28.3, 28.5],
        description: 'Biomedyczny gigant farmaceutyczny, szczepionki mRNA i terapie onkologiczne.'
      },
      {
        ticker: 'VALE',
        name: 'Vale S.A.',
        countryId: 'BRA',
        sector: 'materials',
        icon: '🏗️',
        sharePrice: 11.2,
        sharesTotal: 4500000000,
        peRatio: 5.5,
        dividendYield: 9.5,
        priceHistory: [10.6, 10.9, 11.0, 11.2],
        description: 'Największy na świecie wydobywca rudy żelaza i pelletu z kopalni Carajás.'
      }
    ]
  };
})();
