/**
 * WorldForge: Nations - Geographic Strategic Nodes & Maritime Routes Data
 * Real-world longitude / latitude coordinates [lon, lat] for strategic nodes,
 * major global ports, energy complexes and trade corridors.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  window.WorldForge.Data.WorldMapData = {
    // Strategic Node Coordinates [longitude, latitude]
    capitals: {
      POL: { name: 'Warszawa', coords: [21.0122, 52.2297] },
      DEU: { name: 'Berlin', coords: [13.4050, 52.5200] },
      FRA: { name: 'Paryż', coords: [2.3522, 48.8566] },
      GBR: { name: 'Londyn', coords: [-0.1278, 51.5074] },
      USA: { name: 'Waszyngton D.C.', coords: [-77.0369, 38.9072] },
      CHN: { name: 'Pekin', coords: [116.4074, 39.9042] },
      JPN: { name: 'Tokio', coords: [139.6917, 35.6895] },
      IND: { name: 'Nowe Delhi', coords: [77.2090, 28.6139] },
      BRA: { name: 'Brasília', coords: [-47.8825, -15.7942] },
      CAN: { name: 'Ottawa', coords: [-75.6972, 45.4215] },
      ITA: { name: 'Rzym', coords: [12.4964, 41.9028] },
      ESP: { name: 'Madryt', coords: [-3.7038, 40.4168] },
      UKR: { name: 'Kijów', coords: [30.5234, 50.4501] },
      RUS: { name: 'Moskwa', coords: [37.6173, 55.7558] },
      AUS: { name: 'Canberra', coords: [149.1300, -35.2809] },
      KOR: { name: 'Seul', coords: [126.9780, 37.5665] },
      SAU: { name: 'Rijad', coords: [46.6753, 24.7136] },
      EGY: { name: 'Kair', coords: [31.2357, 30.0444] },
      ZAF: { name: 'Pretoria', coords: [28.2293, -25.7479] },
      MEX: { name: 'Meksyk', coords: [-99.1332, 19.4326] },
      ARG: { name: 'Buenos Aires', coords: [-58.3816, -34.6037] },
      TUR: { name: 'Ankara', coords: [32.8597, 39.9334] },
      ARE: { name: 'Abu Zabi', coords: [54.3773, 24.4539] },
      SGP: { name: 'Singapur', coords: [103.8198, 1.3521] },
      ISR: { name: 'Jerozolima', coords: [35.2137, 31.7683] },
      VNM: { name: 'Hanoi', coords: [105.8342, 21.0278] },
      NGA: { name: 'Abudża', coords: [7.4951, 9.0579] },
      CHE: { name: 'Berno', coords: [7.4474, 46.9480] },
      SWE: { name: 'Sztokholm', coords: [18.0686, 59.3293] },
      NOR: { name: 'Oslo', coords: [10.7522, 59.9139] },
      NLD: { name: 'Amsterdam', coords: [4.9041, 52.3676] }
    },

    // Major Deepwater Seaports
    ports: [
      { id: 'port_gda', countryId: 'POL', name: 'Port Gdańsk / Gdynia', coords: [18.667, 54.37] },
      { id: 'port_rot', countryId: 'NLD', name: 'Port Rotterdam (Europort)', coords: [4.48, 51.92] },
      { id: 'port_ham', countryId: 'DEU', name: 'Port Hamburg', coords: [9.99, 53.55] },
      { id: 'port_shg', countryId: 'CHN', name: 'Port Szanghaj', coords: [121.50, 31.23] },
      { id: 'port_sgp', countryId: 'SGP', name: 'Port Singapur (PSA Hub)', coords: [103.82, 1.28] },
      { id: 'port_lax', countryId: 'USA', name: 'Port Los Angeles', coords: [-118.27, 33.74] },
      { id: 'port_nyc', countryId: 'USA', name: 'Port New York & New Jersey', coords: [-74.01, 40.71] },
      { id: 'port_san', countryId: 'BRA', name: 'Port Santos', coords: [-46.33, -23.96] },
      { id: 'port_hdl', countryId: 'AUS', name: 'Port Hedland (Iron Ore)', coords: [118.58, -20.31] },
      { id: 'port_suez', countryId: 'EGY', name: 'Kanał Sueski (Port Said)', coords: [32.34, 30.58] },
      { id: 'port_busan', countryId: 'KOR', name: 'Port Busan', coords: [129.04, 35.10] },
      { id: 'port_yok', countryId: 'JPN', name: 'Port Jokohama', coords: [139.64, 35.44] },
      { id: 'port_jeb', countryId: 'ARE', name: 'Port Jebel Ali (Dubaj)', coords: [55.03, 25.00] }
    ],

    // Major Energy & Power Generation Infrastructure Nodes
    energyNodes: [
      { id: 'en_belchatow', countryId: 'POL', name: 'Elektrownia Bełchatów', coords: [19.26, 51.26], type: 'thermal' },
      { id: 'en_nordsee', countryId: 'DEU', name: 'Offshore Nordsee Wind Cluster', coords: [7.85, 54.18], type: 'wind' },
      { id: 'en_flamanville', countryId: 'FRA', name: 'Flamanville Nuclear Plant', coords: [-1.88, 49.53], type: 'nuclear' },
      { id: 'en_permian', countryId: 'USA', name: 'Permian Basin Oil & Gas', coords: [-102.5, 31.8], type: 'oil' },
      { id: 'en_threegorges', countryId: 'CHN', name: 'Zapora Trzech Przełomów', coords: [111.0, 30.82], type: 'hydro' },
      { id: 'en_ghawar', countryId: 'SAU', name: 'Pole Naftowe Ghawar (Aramco)', coords: [49.33, 25.4], type: 'oil' },
      { id: 'en_itaipu', countryId: 'BRA', name: 'Hydroelektrownia Itaipu', coords: [-54.58, -25.40], type: 'hydro' },
      { id: 'en_troll', countryId: 'NOR', name: 'Szelf Gazowy Troll Morze Północne', coords: [3.66, 60.64], type: 'gas' },
      { id: 'en_barakah', countryId: 'ARE', name: 'Elektrownia Jądrowa Barakah', coords: [52.26, 23.97], type: 'nuclear' },
      { id: 'en_kori', countryId: 'KOR', name: 'Kompleks Jądrowy Kori', coords: [129.29, 35.32], type: 'nuclear' }
    ],

    // Global Maritime Shipping Routes [Array of [lon, lat] waypoints]
    shippingRoutes: [
      {
        id: 'route_asia_europe',
        name: 'Główny Szlak Azja-Europa (przez Suez)',
        waypoints: [
          [121.50, 31.23], [114.15, 22.28], [103.82, 1.28], [80.27, 6.05], [55.03, 25.00],
          [43.50, 12.60], [32.34, 30.58], [14.50, 35.90], [-5.60, 36.00], [4.48, 51.92]
        ]
      },
      {
        id: 'route_transpacific',
        name: 'Korytarz Północno-Pacyficzny (Azja-USA)',
        waypoints: [
          [121.50, 31.23], [139.64, 35.44], [175.0, 45.0], [-140.0, 42.0], [-118.27, 33.74]
        ]
      },
      {
        id: 'route_transatlantic',
        name: 'Korytarz Północnoatlantycki (USA-Europa)',
        waypoints: [
          [-74.01, 40.71], [-50.0, 45.0], [-20.0, 48.0], [4.48, 51.92]
        ]
      },
      {
        id: 'route_persian_gulf',
        name: 'Szlaki Tankowców Zatoki Perskiej',
        waypoints: [
          [55.03, 25.00], [60.0, 22.0], [75.0, 10.0], [103.82, 1.28]
        ]
      },
      {
        id: 'route_south_atlantic',
        name: 'Szlak Południowoatlantycki (Brazylia-Europa)',
        waypoints: [
          [-46.33, -23.96], [-30.0, -5.0], [-15.0, 20.0], [-5.60, 36.00], [4.48, 51.92]
        ]
      },
      {
        id: 'route_baltic',
        name: 'Korytarz Bałtycki (Gdańsk-Rotterdam)',
        waypoints: [
          [18.667, 54.37], [12.50, 55.60], [8.0, 57.0], [4.48, 51.92]
        ]
      }
    ]
  };
})();
