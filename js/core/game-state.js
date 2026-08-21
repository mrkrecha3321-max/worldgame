/**
 * WorldForge: Nations - Game State Manager
 * Central state store containing all world simulation data in exact base units.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  class GameStateManager {
    constructor() {
      this.state = null;
      this.subscribers = [];
    }

    /**
     * Initialize new game
     * @param {string} playerCountryId - ISO3 code (e.g. 'POL')
     * @param {Object} options - custom settings
     */
    createNewGame(playerCountryId = 'POL', options = {}) {
      const now = new Date();
      const initialSeed = options.seed || Date.now();
      window.WorldForge.Core.Random.setSeed(initialSeed);

      // Create base state
      this.state = {
        meta: {
          version: window.WorldForge.CONFIG.SAVE_VERSION,
          createdAt: now.toISOString(),
          gameTitle: window.WorldForge.GAME_TITLE,
          seed: initialSeed
        },
        time: {
          startDate: now.toISOString(),
          currentTurn: 1, // Month 1
          turnProgressSeconds: 0,
          turnDurationSeconds: window.WorldForge.CONFIG.DEFAULT_TURN_SECONDS,
          speed: 1, // 0 = paused, 1 = 1x, 2 = 2x, 4 = 4x
          isPaused: false
        },
        settings: {
          displayCurrency: 'LOCAL' // 'LOCAL' | 'USD' | 'EUR'
        },
        playerCountryId: playerCountryId.toUpperCase(),
        countries: {},
        globalMarket: {
          prices: {}, // Keyed by resource id
          priceHistory: {},
          globalVolume: {}
        },
        exchange: null, // rynek giełdowy (kopiowany z danych przy inicjalizacji — patrz ensureExchangeMarket)
        bilateralDeals: [],
        diplomaticTreaties: [],
        activeEvents: [],
        eventHistory: [],
        turnReports: [],
        notifications: [],
        goldReservesV3: true, // rezerwy złota 2026 zainicjalizowane w generateInitialPortfolio
        debug: !!options.debug
      };

      // Load static data and build initial country states
      this.buildInitialWorld();

      console.log(`[GameState] New game initialized. Player: ${this.state.playerCountryId}, Turn: 1`);
      this.notifySubscribers('gameInitialized', this.state);
      return this.state;
    }

    /**
     * Populates all country state objects from Data repositories
     */
    buildInitialWorld() {
      const countriesData = window.WorldForge.Data.Countries || [];
      const profilesData = window.WorldForge.Data.CountryProfiles || {};
      const resourcesData = window.WorldForge.Data.Resources || [];

      // Initialize global market prices
      for (const res of resourcesData) {
        this.state.globalMarket.prices[res.id] = res.basePrice;
        this.state.globalMarket.priceHistory[res.id] = [res.basePrice];
        this.state.globalMarket.globalVolume[res.id] = { supply: 1000000, demand: 1000000 };
      }

      // Initialize sovereign exchange market (deep copy: prices are game-state,
      // not static data — dzięki temu zapisują się w save'ach i synchronizują w multiplayerze)
      this.ensureExchangeMarket();

      // Initialize each country
      for (const cData of countriesData) {
        const id = cData.id;
        const profile = profilesData[id] || {};

        const pop = cData.population || 10000000;
        const gdpNominal = cData.gdpNominal || 100000000000; // Full base units in USD
        const gdpPerCapita = cData.gdpPerCapita || Math.round(gdpNominal / Math.max(1, pop));

        const debtNominal = cData.debtNominal || Math.round(gdpNominal * ((cData.debtToGdp || 50) / 100));
        // Cap płynnych rezerw startowych: nawet największe gospodarki (Chiny ~18 bln PKB)
        // nie zaczynają z setkami miliardów gotówki do wydania od ręki — realnie budżet
        // operacyjny państwa to ułamek PKB, a inwestycje finansuje się długiem.
        const treasury = Math.min(cData.treasury || Math.round(gdpNominal * 0.04), 100000000000);
        const foreignReserves = cData.foreignReserves || Math.round(gdpNominal * 0.15);

        this.state.countries[id] = {
          id: id,
          name: cData.name,
          namePl: cData.namePl || cData.name,
          flag: cData.flag || '🌐',
          region: cData.region || 'Europa',
          subregion: cData.subregion || '',
          capital: cData.capital || 'Stolica',
          areaKm2: cData.areaKm2 || 100000,
          currency: cData.currency || 'USD',
          currencySymbol: cData.currencySymbol || cData.currency || 'USD',
          currencyExchangeRate: cData.currencyExchangeRate || 1.0, // vs USD
          monetaryUnion: cData.monetaryUnion || null, // e.g. 'EUR'
          isUnionLeader: !!cData.isUnionLeader,
          governmentType: cData.governmentType || 'Republika parlamentarna',
          botArchetype: cData.botArchetype || 'Ostrożny balans',
          profileLevel: cData.profileLevel || 'B',
          dataConfidence: cData.confidence || 'Wysoka',
          isEstimated: !!cData.isEstimated,
          dataSources: cData.dataSources || 'IMF WEO / World Bank 2025/2026',
          dataYear: cData.dataYear || 2026,
          lastUpdated: cData.lastUpdated || '2026-08',
          economicProfile: cData.economicProfile || `Gospodarka narodowa państwa ${cData.namePl || cData.name}.`,
          mainResources: cData.mainResources || ['Zasoby rolne', 'Energia'],
          mainSectors: cData.mainSectors || ['Usługi', 'Przemysł', 'Handel'],
          mainTradingPartners: cData.mainTradingPartners || ['USA', 'CHN', 'DEU'],

          // Macroeconomics
          economy: {
            gdpNominal: gdpNominal,
            gdpReal: gdpNominal,
            gdpGrowthYoY: cData.gdpGrowth || 2.2,
            gdpHistory: [gdpNominal],
            gdpPerCapita: gdpPerCapita,
            inflation: cData.inflation || 2.8,
            inflationAnchor: Math.min(40, Math.max(1.5, cData.inflation || 2.8)), // strukturalna kotwica inflacyjna państwa
            inflationHistory: [cData.inflation || 2.8],
            unemployment: cData.unemployment || 5.2,
            unemploymentHistory: [cData.unemployment || 5.2],
            averageMonthlyWage: cData.averageWage || Math.round((gdpPerCapita / 12) * 0.55),
            productivityIndex: cData.productivityIndex || 100,
            giniInequality: cData.gini || 30.5,
            socialApproval: cData.socialApproval || 55.0,
            politicalStability: cData.politicalStability || 70.0,
            consumerConfidence: 65.0,
            businessConfidence: 62.0,
            creditRating: cData.creditRating || 'A'
          },

          // Treasury & Reserves
          treasury: treasury,
          
          // Budget (Monthly figures in full exact units of base USD / domestic currency)
          budget: {
            revenues: {
              vat: 0,
              pit: 0,
              cit: 0,
              excise: 0,
              socialContributions: 0,
              propertyTax: 0,
              tariffs: 0,
              resourceRoyalties: 0,
              soeDividends: 0,
              other: 0,
              total: 0
            },
            spending: {
              health: profile.spending?.health || 16.0, // % share of standard baseline expenditure
              education: profile.spending?.education || 12.0,
              pensions: profile.spending?.pensions || 22.0,
              socialWelfare: profile.spending?.socialWelfare || 10.0,
              defense: profile.spending?.defense || 8.0,
              infrastructure: profile.spending?.infrastructure || 10.0,
              energy: profile.spending?.energy || 5.0,
              research: profile.spending?.research || 4.0,
              publicSafety: profile.spending?.publicSafety || 5.0,
              administration: profile.spending?.administration || 4.0,
              environment: profile.spending?.environment || 2.0,
              subsidies: profile.spending?.subsidies || 2.0,
              totalExpenditure: 0,
              debtServicing: 0
            },
            balanceMonthly: 0,
            balanceHistory: [],
            primaryBalance: 0
          },

          // Taxes configuration
          taxes: {
            vatRate: profile.taxes?.vatRate || 23.0,
            pitRate: profile.taxes?.pitRate || 18.0,
            citRate: profile.taxes?.citRate || 19.0,
            exciseRate: profile.taxes?.exciseRate || 15.0,
            socialContributionRate: profile.taxes?.socialContributionRate || 28.0,
            propertyTaxRate: profile.taxes?.propertyTaxRate || 1.2,
            importTariffRate: profile.taxes?.importTariffRate || 3.0,
            efficiency: profile.taxes?.efficiency || 88.0,
            greyEconomyShare: profile.taxes?.greyEconomyShare || 14.0,
            investments: {
              digitalization: 50000000,
              antiFraud: 30000000
            }
          },

          // Debt & Sovereign Bonds
          debt: {
            totalDebt: debtNominal,
            debtToGdp: cData.debtToGdp || 50.0,
            bonds: this.generateInitialBonds(id, cData, gdpNominal, debtNominal),
            creditRating: cData.creditRating || 'A',
            riskPremium: 0.8,
            monthlyInterestCost: 0,
            historicalDebtToGdp: [cData.debtToGdp || 50.0]
          },

          // Central Bank
          centralBank: {
            name: profile.centralBank?.name || `Bank Centralny (${id})`,
            baseRate: profile.centralBank?.baseRate || 3.25,
            inflationTarget: Math.min(6.0, Math.max(1.5, (cData.inflation || 2.8) * 0.7)), // cel dostosowany do realiów państwa
            reserveRequirement: 3.5,
            foreignReserves: foreignReserves,
            m2MoneySupply: Math.round(gdpNominal * 0.95),
            balanceSheetAssets: Math.round(gdpNominal * 0.35)
          },

          // Commercial Banks
          commercialBanks: this.generateInitialBanks(id, cData, gdpNominal),

          // Credit Market Segments
          creditMarket: {
            mortgage: { volume: Math.round(gdpNominal * 0.35), rate: 5.5, npl: 2.1, monthlyNew: Math.round(gdpNominal * 0.005) },
            consumer: { volume: Math.round(gdpNominal * 0.12), rate: 8.5, npl: 4.8, monthlyNew: Math.round(gdpNominal * 0.003) },
            corporate: { volume: Math.round(gdpNominal * 0.28), rate: 6.2, npl: 3.2, monthlyNew: Math.round(gdpNominal * 0.004) },
            investment: { volume: Math.round(gdpNominal * 0.15), rate: 5.8, npl: 2.5, monthlyNew: Math.round(gdpNominal * 0.002) },
            interbank: { volume: Math.round(gdpNominal * 0.08), rate: 3.8, npl: 0.2, monthlyNew: Math.round(gdpNominal * 0.010) },
            foreign: { volume: Math.round(gdpNominal * 0.10), rate: 4.5, npl: 1.8, monthlyNew: Math.round(gdpNominal * 0.001) },
            housingPriceIndex: 100.0,
            bubbleRiskScore: 18.0
          },

          // Businesses Aggregate
          businesses: {
            activeEnterprises: Math.max(100, Math.round(pop / 18)),
            averageProfitMargin: 8.5,
            capacityUtilization: 78.5,
            corporateCapex: Math.round(gdpNominal * 0.18),
            monthlyBankruptcies: Math.max(1, Math.round(pop / 100000)),
            hiringRate: 2.1,
            layoffRate: 1.8
          },

          // Households Aggregate
          households: {
            count: Math.max(50, Math.round(pop / 2.6)),
            disposableIncomeMonthly: Math.round((gdpPerCapita / 12) * 0.65),
            savingsRate: 9.5,
            totalSavings: Math.round(gdpNominal * 0.55),
            debtServiceRatio: 12.5,
            costOfLivingIndex: 100.0,
            happinessIndex: profile.happiness || 62.0
          },

          // Demographics
          population: {
            total: pop,
            history: [pop],
            birthRate: profile.birthRate || 1.4,
            mortalityRate: 10.2,
            netMigrationMonthly: Math.round((pop * 0.001) / 12),
            workingAgeShare: 62.0,
            youthShare: 16.0,
            elderlyShare: 22.0,
            workforceTotal: Math.round(pop * 0.62 * 0.75),
            educationQualityIndex: profile.educationIndex || 78.0,
            healthcareQualityIndex: profile.healthIndex || 75.0,
            lifeExpectancy: profile.lifeExpectancy || 78.5
          },

          // Production, Stockpiles & Commodities
          production: this.generateInitialProduction(id, cData, pop, gdpNominal),

          // Sovereign Portfolio (rezerwy złota = realne dane 2026)
          portfolio: this.generateInitialPortfolio(id, gdpNominal),

          // Infrastructure & Logistics
          infrastructure: {
            roadQuality: profile.infra?.roadQuality || 72,
            railQuality: profile.infra?.railQuality || 65,
            highSpeedRailKm: profile.infra?.highSpeedRailKm || 0,
            seaportsCapacity: profile.infra?.seaportsCapacity || 50,
            airportsCapacity: profile.infra?.airportsCapacity || 60,
            digitalBroadband5GCoverage: profile.infra?.broadband || 80,
            powerGridReliability: profile.infra?.gridReliability || 94,
            publicHousingStock: Math.round(pop * 0.15),
            hospitalBedsPer1000: profile.infra?.hospitalBeds || 6.2,
            schoolsUniversitiesIndex: 78
          },

          // Energy Grid & Power Generation
          energy: {
            totalCapacityGW: profile.energy?.totalGW || Math.max(1.0, Math.round((pop / 1000000) * 1.2 * 10) / 10),
            peakDemandGW: profile.energy?.peakDemandGW || Math.max(0.8, Math.round((pop / 1000000) * 0.95 * 10) / 10),
            monthlyGenerationTWh: 0,
            monthlyConsumptionTWh: 0,
            cleanEnergyShare: profile.energy?.cleanShare || 35.0,
            gridLossPercent: 6.5,
            blackoutRisk: 1.5,
            carbonEmissionsMt: profile.energy?.emissions || Math.round((pop / 1000000) * 7.5),
            mix: {
              coal: profile.energy?.mix?.coal || 40,
              gas: profile.energy?.mix?.gas || 20,
              nuclear: profile.energy?.mix?.nuclear || 0,
              hydro: profile.energy?.mix?.hydro || 10,
              wind: profile.energy?.mix?.wind || 15,
              solar: profile.energy?.mix?.solar || 12,
              storage: profile.energy?.mix?.storage || 3
            }
          },

          // Research & Technologies
          research: {
            monthlyPoints: Math.round(gdpNominal / 1000000000 * (profile.researchPointsMultiplier || 1)),
            accumulatedPoints: 0,
            activeTechId: null,
            activeTechProgress: 0,
            unlockedTechs: profile.unlockedTechs || ['tech_adv_banking_1', 'tech_power_grid_1', 'tech_basic_automation']
          },

          // Megaprojects under construction
          projects: {
            active: [],
            completed: []
          },

          // Military Peace-Time Assets
          military: {
            deterrenceScore: profile.military?.deterrence || 45,
            readiness: profile.military?.readiness || 80,
            morale: 85,
            modernizationLevel: profile.military?.modernization || 65,
            totalPersonnel: profile.military?.personnel || Math.round(pop * 0.0035),
            reservesCount: profile.military?.reserves || Math.round(pop * 0.007),
            monthlyMaintenanceCost: Math.round((gdpNominal / 12) * 0.33 * 0.08),
            branches: {
              landForces: { personnel: Math.round((profile.military?.personnel || pop * 0.0035) * 0.55), equipmentQuality: 68, share: 40 },
              airForce: { personnel: Math.round((profile.military?.personnel || pop * 0.0035) * 0.20), equipmentQuality: 75, share: 25 },
              navy: { personnel: Math.round((profile.military?.personnel || pop * 0.0035) * 0.10), equipmentQuality: 70, share: 15 },
              airDefense: { personnel: Math.round((profile.military?.personnel || pop * 0.0035) * 0.08), equipmentQuality: 72, share: 10 },
              cyberDefense: { personnel: Math.round((profile.military?.personnel || pop * 0.0035) * 0.04), equipmentQuality: 80, share: 6 },
              logistics: { personnel: Math.round((profile.military?.personnel || pop * 0.0035) * 0.03), equipmentQuality: 65, share: 4 }
            }
          },

          // Bilateral diplomatic relations (-100 to +100)
          diplomacy: {
            relations: this.generateInitialRelations(id, countriesData),
            sanctionsAgainst: [],
            embargoesAgainst: [],
            tradeTreatiesWith: [],
            aidGivenMonthly: 0,
            aidReceivedMonthly: 0
          }
        };

        // Normalizacja udziałów wydatków publicznych do sumy ~100%
        // (profil kraju określa KOMPOZYCJĘ wydatków, natomiast poziom
        // bazowy ~33% PKB jest wspólny — zapobiega to trwałej nadwyżce
        // u państw o oszczędnych profilach i trwałemu deficytowi u rozrzutnych)
        {
          const spending = this.state.countries[id].budget.spending;
          const shareKeys = ['health', 'education', 'pensions', 'socialWelfare', 'defense', 'infrastructure', 'energy', 'research', 'publicSafety', 'administration', 'environment', 'subsidies'];
          const shareSum = shareKeys.reduce((s, k) => s + (spending[k] || 0), 0);
          if (shareSum > 0 && Math.abs(shareSum - 100) > 1.5) {
            const scale = 100 / shareSum;
            shareKeys.forEach(k => { spending[k] = Math.round((spending[k] || 0) * scale * 10) / 10; });
          }
        }
      }
    }

    generateInitialBonds(countryId, cData, gdpNominal, debtTotal) {
      const isAAA = ['DEU', 'USA', 'CHE', 'NOR', 'SGP', 'NLD'].includes(countryId);
      const baseYield = isAAA ? 2.8 : (cData.debtToGdp > 80 ? 5.2 : 3.8);

      return [
        {
          id: `bond_${countryId}_1y`,
          name: '1-Roczne Bony Skarbowe',
          principal: Math.round(debtTotal * 0.15),
          yieldRate: baseYield - 0.5,
          maturityMonths: 8,
          totalDurationMonths: 12,
          currency: cData.currency || 'USD',
          investorGroup: 'Krajowe banki komercyjne',
          isForeign: false
        },
        {
          id: `bond_${countryId}_5y`,
          name: '5-Letnie Obligacje Skarbowe',
          principal: Math.round(debtTotal * 0.40),
          yieldRate: baseYield,
          maturityMonths: 36,
          totalDurationMonths: 60,
          currency: cData.currency || 'USD',
          investorGroup: 'Fundusze emerytalne i instytucje',
          isForeign: false
        },
        {
          id: `bond_${countryId}_10y`,
          name: '10-Letnie Benchmarkowe Obligacje',
          principal: Math.round(debtTotal * 0.35),
          yieldRate: baseYield + 0.6,
          maturityMonths: 72,
          totalDurationMonths: 120,
          currency: cData.currency || 'USD',
          investorGroup: 'Inwestorzy globalni i banki centralne',
          isForeign: true
        },
        {
          id: `bond_${countryId}_30y`,
          name: '30-Letnie Długoterminowe Obligacje',
          principal: Math.round(debtTotal * 0.10),
          yieldRate: baseYield + 1.1,
          maturityMonths: 240,
          totalDurationMonths: 360,
          currency: 'USD',
          investorGroup: 'Zagraniczne fundusze suwerenne',
          isForeign: true
        }
      ];
    }

    generateInitialBanks(countryId, cData, gdpNominal) {
      const bankNames = {
        POL: ['PKO Bank Polski', 'Bank Pekao S.A.', 'Santander Bank Polska', 'mBank S.A.', 'ING Bank Śląski'],
        USA: ['JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citigroup', 'Goldman Sachs'],
        DEU: ['Deutsche Bank', 'Commerzbank', 'DZ Bank Group', 'Bayerische Landesbank', 'KfW'],
        GBR: ['HSBC UK', 'Barclays', 'Lloyds Banking Group', 'NatWest Group', 'Standard Chartered'],
        FRA: ['BNP Paribas', 'Crédit Agricole', 'Société Générale', 'BPCE Group', 'Crédit Mutuel'],
        CHN: ['ICBC', 'China Construction Bank', 'Agricultural Bank of China', 'Bank of China', 'Bank of Communications'],
        JPN: ['Mitsubishi UFJ Financial', 'Sumitomo Mitsui Banking', 'Mizuho Financial', 'Japan Post Bank', 'Resona Bank'],
        IND: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Punjab National Bank'],
        CAN: ['Royal Bank of Canada', 'TD Bank', 'Scotiabank', 'Bank of Montreal'],
        BRA: ['Itaú Unibanco', 'Banco do Brasil', 'Bradesco', 'Caixa Econômica Federal'],
        AUS: ['Commonwealth Bank of Australia', 'Westpac Banking', 'ANZ Group', 'National Australia Bank']
      };

      const defaultNames = [
        `Narodowy Bank Kredytowy (${countryId})`,
        `Bank Handlowy i Przemysłowy (${countryId})`,
        `Bank Rozwoju i Inwestycji (${countryId})`
      ];

      const list = bankNames[countryId] || defaultNames;
      const totalBankingAssets = Math.round(gdpNominal * 1.35);
      const perBankAsset = Math.round(totalBankingAssets / list.length);

      return list.map((name, index) => {
        const assets = Math.round(perBankAsset * (1 + (index === 0 ? 0.35 : (index === 1 ? 0.05 : -0.2))));
        const capital = Math.round(assets * 0.145);
        const deposits = Math.round(assets * 0.72);
        const loans = Math.round(assets * 0.65);
        const govBonds = Math.round(assets * 0.18);
        return {
          id: `bank_${countryId}_${index + 1}`,
          name: name,
          assets: assets,
          capital: capital,
          deposits: deposits,
          loans: loans,
          govBondsHolding: govBonds,
          nplRatio: 2.8 + (index * 0.4),
          carSolvencyRatio: 14.8 - (index * 0.3),
          liquidityCoverageRatio: 135 - (index * 5),
          monthlyProfit: Math.round(assets * 0.0012),
          status: 'Zdrowy'
        };
      });
    }

    /**
     * Portfel inwestycyjny państwa — startowe rezerwy złota wg REALNYCH danych 2026
     * (np. USA 8 133 t, Niemcy 3 350 t, Polska 570 t; świat CB ~36 000 t).
     */
    generateInitialPortfolio(countryId, gdpNominal) {
      const Gold = window.WorldForge.Data.GoldReserves;
      let goldOz = 0;
      if (Gold && typeof Gold.reservesOz === 'function') {
        goldOz = Gold.reservesOz(countryId, gdpNominal);
      }
      return {
        commodities: { gold: goldOz },
        stocks: {},
        totalInvested: 0,
        monthlyDividends: 0,
        // Tracker sprzedaży rezerw (do okien ostrzegawczych i kryzysu walutowego)
        goldSoldLast12mOz: 0,
        goldReserveCrisis: false
      };
    }

    generateInitialProduction(countryId, cData, pop, gdpNominal) {
      const resources = window.WorldForge.Data.Resources || [];
      const prod = {};

      for (const res of resources) {
        let baseFactor = 1.0;
        if (res.id === 'food') baseFactor = (pop / 1e6) * 1.1;
        else if (res.id === 'energy') baseFactor = (pop / 1e6) * 1.0;
        else if (res.id === 'consumer_goods') baseFactor = (gdpNominal / 1e9) * 0.8;
        else baseFactor = (gdpNominal / 2e9) * (0.5 + (res.category === 'raw' ? 0.4 : 0.8));

        // Adjust for country specialties
        if (countryId === 'POL' && ['coal', 'food', 'vehicles', 'machinery'].includes(res.id)) baseFactor *= 1.6;
        else if (countryId === 'SAU' && res.id === 'oil') baseFactor *= 8.0;
        else if (countryId === 'CHN' && ['steel', 'electronics', 'solar_panels'].includes(res.id)) baseFactor *= 5.0;
        else if (countryId === 'DEU' && ['machinery', 'vehicles', 'medicine'].includes(res.id)) baseFactor *= 3.0;
        else if (countryId === 'USA' && ['semiconductors', 'military_equipment', 'oil'].includes(res.id)) baseFactor *= 3.5;

        const capacity = Math.max(500, Math.round(baseFactor * 1000));
        const output = Math.round(capacity * 0.85);
        const consumption = Math.round(output * 0.90);

        prod[res.id] = {
          capacity: capacity,
          output: output,
          consumption: consumption,
          stockpile: Math.round(consumption * 1.5),
          unitCost: Math.round(res.basePrice * 0.75),
          exportVolume: Math.max(0, output - consumption),
          importVolume: Math.max(0, consumption - output),
          dependencyOnTopSupplierPercent: 18.0
        };
      }
      return prod;
    }

    generateInitialRelations(countryId, countriesData) {
      const rels = {};
      for (const c of countriesData) {
        if (c.id === countryId) continue;
        let score = 25; // default neutral friendly
        if (['POL', 'DEU', 'FRA', 'GBR', 'USA', 'ITA', 'ESP', 'CAN', 'AUS', 'JPN', 'KOR'].includes(countryId) &&
            ['POL', 'DEU', 'FRA', 'GBR', 'USA', 'ITA', 'ESP', 'CAN', 'AUS', 'JPN', 'KOR'].includes(c.id)) {
          score = 70; // Allied western democratic bloc
        } else if (['CHN', 'RUS', 'IRN', 'PRK'].includes(countryId) && ['CHN', 'RUS', 'IRN', 'PRK'].includes(c.id)) {
          score = 65;
        }
        rels[c.id] = score;
      }
      return rels;
    }

    getState() {
      return this.state;
    }

    /**
     * Tworzy (jeśli jeszcze nie istnieje) kopię rynku giełdowego w stanie gry.
     * Wywoływane przy inicjalizacji nowej gry oraz po wczytaniu starszych
     * zapisów, które nie zawierały sekcji `exchange`.
     */
    ensureExchangeMarket() {
      if (this.state.exchange && Array.isArray(this.state.exchange.commodities)) return this.state.exchange;

      const src = window.WorldForge.Data.Exchange || { commodities: [], stocks: [] };
      const clone = (obj) => JSON.parse(JSON.stringify(obj));

      this.state.exchange = {
        commodities: clone(src.commodities).map(c => {
          c.priceHistory = Array.isArray(c.priceHistory) && c.priceHistory.length > 1
            ? c.priceHistory.slice(-60)
            : [c.currentPrice];
          return c;
        }),
        stocks: clone(src.stocks).map(s => {
          s.baseSharePrice = s.baseSharePrice || s.sharePrice;
          s.priceHistory = Array.isArray(s.priceHistory) && s.priceHistory.length > 1
            ? s.priceHistory.slice(-60)
            : [s.sharePrice];
          return s;
        })
      };
      return this.state.exchange;
    }

    getExchangeMarket() {
      return this.ensureExchangeMarket();
    }

    getPlayerCountry() {
      if (!this.state) return null;
      return this.state.countries[this.state.playerCountryId] || null;
    }

    getCountry(countryId) {
      if (!this.state || !this.state.countries) return null;
      return this.state.countries[countryId] || null;
    }

    addNotification(type, title, message, countryId = null, extra = {}) {
      if (!this.state) return;
      // Skrzynka powiadomień należy do GRACZA. Zdarzenia 183 państw AI nie mogą
      // jej zalewać (bufor 100 slotów). Boty, które chcą poinformować gracza,
      // przekazują jawnie countryId === state.playerCountryId (np. oferty handlowe).
      const owner = countryId || this.state.playerCountryId;
      if (owner !== this.state.playerCountryId) return null;

      const record = {
        id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        turn: this.state.time.currentTurn,
        type: type,
        title: title,
        message: message,
        countryId: countryId || this.state.playerCountryId,
        timestamp: Date.now(),
        read: false,
        ...extra
      };
      this.state.notifications.unshift(record);
      if (this.state.notifications.length > window.WorldForge.CONFIG.MAX_NOTIFICATION_HISTORY) {
        this.state.notifications.pop();
      }
      this.notifySubscribers('notificationAdded', record);
      return record;
    }

    subscribe(callback) {
      this.subscribers.push(callback);
    }

    notifySubscribers(event, data) {
      for (const cb of this.subscribers) {
        try {
          cb(event, data);
        } catch (err) {
          console.error('[GameState] Subscriber callback error:', err);
        }
      }
    }
  }

  window.WorldForge.Core.GameState = new GameStateManager();
})();
