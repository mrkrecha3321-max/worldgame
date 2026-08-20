/**
 * WorldForge: Nations - Detailed Country Strategic Profiles (Level A)
 * Calibrated for realistic positive initial cash flow in Stable Start mode.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Data = window.WorldForge.Data || {};

  window.WorldForge.Data.CountryProfiles = {
    POL: {
      spending: {
        health: 14.0, education: 10.0, pensions: 18.0, socialWelfare: 8.0,
        defense: 9.0, infrastructure: 7.5, energy: 3.5, research: 3.0,
        publicSafety: 3.5, administration: 3.0, environment: 1.0, subsidies: 1.5
      },
      taxes: {
        vatRate: 23.0, pitRate: 17.0, citRate: 19.0, exciseRate: 16.0,
        socialContributionRate: 28.5, propertyTaxRate: 1.1, importTariffRate: 3.0,
        efficiency: 92.5, greyEconomyShare: 11.5
      },
      centralBank: {
        name: 'Narodowy Bank Polski (NBP)',
        baseRate: 5.75,
        foreignReserves: 215000000000
      },
      energy: {
        totalGW: 58.5, peakDemandGW: 28.2, cleanShare: 32.0, emissions: 290,
        mix: { coal: 55, gas: 10, nuclear: 0, hydro: 3, wind: 18, solar: 12, storage: 2 }
      },
      infra: { roadQuality: 82, railQuality: 74, highSpeedRailKm: 0, seaportsCapacity: 68, airportsCapacity: 72, broadband: 88, gridReliability: 94, hospitalBeds: 6.5 },
      military: { deterrence: 68, readiness: 88, modernization: 75, personnel: 215000, reserves: 300000 },
      unlockedTechs: ['tech_macro_analytics', 'tech_adv_banking_1', 'tech_power_grid_1', 'tech_intermodal_logistics', 'tech_basic_automation']
    },

    USA: {
      spending: {
        health: 18.0, education: 8.0, pensions: 16.0, socialWelfare: 6.0,
        defense: 13.0, infrastructure: 5.5, energy: 2.5, research: 5.0,
        publicSafety: 3.5, administration: 2.5, environment: 1.0, subsidies: 1.0
      },
      taxes: {
        vatRate: 7.5, pitRate: 24.0, citRate: 21.0, exciseRate: 10.0,
        socialContributionRate: 15.3, propertyTaxRate: 1.8, importTariffRate: 3.5,
        efficiency: 94.0, greyEconomyShare: 7.5
      },
      centralBank: {
        name: 'Federal Reserve System (FED)',
        baseRate: 4.75,
        foreignReserves: 240000000000
      },
      energy: {
        totalGW: 1250.0, peakDemandGW: 760.0, cleanShare: 42.0, emissions: 4800,
        mix: { coal: 16, gas: 42, nuclear: 18, hydro: 6, wind: 10, solar: 6, storage: 2 }
      },
      infra: { roadQuality: 86, railQuality: 68, highSpeedRailKm: 350, seaportsCapacity: 92, airportsCapacity: 98, broadband: 94, gridReliability: 96, hospitalBeds: 2.8 },
      military: { deterrence: 99, readiness: 96, modernization: 95, personnel: 1350000, reserves: 800000 },
      unlockedTechs: [
        'tech_macro_analytics', 'tech_algorithmic_fiscal', 'tech_adv_banking_1', 'tech_ai_credit_scoring',
        'tech_power_grid_1', 'tech_intermodal_logistics', 'tech_basic_automation', 'tech_additive_manufacturing',
        'tech_euv_lithography', 'tech_autonomous_agents', 'tech_mrna_therapeutics', 'tech_hypersonic_glide',
        'tech_autonomous_swarm', 'tech_reusable_heavy_rocketry'
      ]
    },

    DEU: {
      spending: {
        health: 16.0, education: 9.0, pensions: 19.0, socialWelfare: 10.0,
        defense: 6.0, infrastructure: 6.0, energy: 3.5, research: 4.5,
        publicSafety: 3.0, administration: 2.5, environment: 2.0, subsidies: 1.5
      },
      taxes: {
        vatRate: 19.0, pitRate: 28.0, citRate: 15.0, exciseRate: 18.0,
        socialContributionRate: 39.5, propertyTaxRate: 1.2, importTariffRate: 2.5,
        efficiency: 96.0, greyEconomyShare: 8.0
      },
      centralBank: {
        name: 'Deutsche Bundesbank / EBC',
        baseRate: 3.75,
        foreignReserves: 300000000000
      },
      energy: {
        totalGW: 245.0, peakDemandGW: 82.0, cleanShare: 58.0, emissions: 620,
        mix: { coal: 24, gas: 14, nuclear: 0, hydro: 4, wind: 34, solar: 20, storage: 4 }
      },
      infra: { roadQuality: 88, railQuality: 84, highSpeedRailKm: 1650, seaportsCapacity: 86, airportsCapacity: 92, broadband: 90, gridReliability: 98, hospitalBeds: 7.8 },
      military: { deterrence: 72, readiness: 70, modernization: 82, personnel: 182000, reserves: 35000 },
      unlockedTechs: [
        'tech_macro_analytics', 'tech_adv_banking_1', 'tech_power_grid_1', 'tech_perovskite_solar',
        'tech_intermodal_logistics', 'tech_basic_automation', 'tech_circular_metallurgy', 'tech_mrna_therapeutics'
      ]
    },

    CHN: {
      spending: {
        health: 10.0, education: 10.0, pensions: 14.0, socialWelfare: 6.0,
        defense: 10.0, infrastructure: 14.0, energy: 5.0, research: 6.0,
        publicSafety: 4.5, administration: 3.0, environment: 2.5, subsidies: 2.0
      },
      taxes: {
        vatRate: 13.0, pitRate: 20.0, citRate: 25.0, exciseRate: 12.0,
        socialContributionRate: 32.0, propertyTaxRate: 0.8, importTariffRate: 5.5,
        efficiency: 92.0, greyEconomyShare: 11.0
      },
      centralBank: {
        name: 'Ludowy Bank Chin (PBoC)',
        baseRate: 3.10,
        foreignReserves: 3250000000000
      },
      energy: {
        totalGW: 2900.0, peakDemandGW: 1400.0, cleanShare: 38.0, emissions: 11500,
        mix: { coal: 56, gas: 4, nuclear: 5, hydro: 15, wind: 10, solar: 8, storage: 2 }
      },
      infra: { roadQuality: 89, railQuality: 96, highSpeedRailKm: 45000, seaportsCapacity: 99, airportsCapacity: 94, broadband: 96, gridReliability: 96, hospitalBeds: 5.0 },
      military: { deterrence: 94, readiness: 92, modernization: 88, personnel: 2050000, reserves: 1200000 },
      unlockedTechs: [
        'tech_macro_analytics', 'tech_algorithmic_fiscal', 'tech_cbdc', 'tech_power_grid_1',
        'tech_smr_nuclear', 'tech_perovskite_solar', 'tech_intermodal_logistics', 'tech_maglev_propulsion',
        'tech_basic_automation', 'tech_circular_metallurgy', 'tech_autonomous_swarm', 'tech_laser_air_defense'
      ]
    }
  };
})();
