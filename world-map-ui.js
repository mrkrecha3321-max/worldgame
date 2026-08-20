/**
 * WorldForge: Nations - Professional GIS World Map UI Engine
 * Features real Natural Earth Admin 0 vector polygons, D3 Geo EqualEarth/NaturalEarth projection,
 * smooth pan & zoom, 8 authentic thematic layers, strategic maritime corridors and smart zoom labels.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const WorldMapUI = {
    colorMode: 'political', // 'political', 'economic', 'population', 'trade', 'energy', 'infrastructure', 'military', 'diplomacy'
    selectedInspectId: null,
    
    // D3 Cache & Projection State
    svg: null,
    gRoot: null,
    projection: null,
    pathGenerator: null,
    zoomBehavior: null,
    currentTransform: null,
    containerWidth: 900,
    containerHeight: 520,

    render(container) {
      if (!container) return;

      const state = window.WorldForge.Core.GameState.getState();
      const playerCountry = window.WorldForge.Core.GameState.getPlayerCountry();
      const geoData = window.WorldForge.Data.worldGeography;

      if (!geoData || !geoData.features) {
        container.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">Ładowanie danych geograficznych...</div>';
        return;
      }

      container.innerHTML = `
        <div class="map-container" id="map-interactive-container">
          
          <!-- Floating Thematic Layer Toolbar -->
          <div class="map-floating-controls">
            <div class="map-layer-selector" id="map-layer-selector">
              ${[
                { id: 'political', label: '1. Polityczna' },
                { id: 'economic', label: '2. Gospodarcza' },
                { id: 'population', label: '3. Ludność' },
                { id: 'trade', label: '4. Szlaki i Handel' },
                { id: 'energy', label: '5. Energetyka' },
                { id: 'infrastructure', label: '6. Infrastruktura' },
                { id: 'military', label: '7. Wojsko / Bazy' },
                { id: 'diplomacy', label: '8. Dyplomacja' }
              ].map(layer => `
                <button class="map-mode-btn ${this.colorMode === layer.id ? 'active' : ''}" data-layer="${layer.id}">
                  ${layer.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Pan / Zoom Controls Pad -->
          <div class="map-zoom-pad">
            <button class="map-zoom-btn" id="btn-map-zoom-in" title="Przybliż">+</button>
            <button class="map-zoom-btn" id="btn-map-zoom-out" title="Oddal">−</button>
            <button class="map-zoom-btn" id="btn-map-zoom-reset" title="Resetuj widok">⟲</button>
          </div>

          <!-- Layer Legend Box -->
          <div class="map-legend-box" id="map-legend-box">
            ${this.renderLegendHtml()}
          </div>

          <!-- SVG Canvas Container -->
          <svg class="world-map-svg" id="world-svg-root" style="background: var(--map-ocean);"></svg>

          <!-- Floating Map Tooltip -->
          <div id="map-floating-tooltip" class="map-tooltip"></div>
        </div>
      `;

      this.initD3Map(container, geoData, state, playerCountry);
    },

    initD3Map(container, geoData, state, playerCountry) {
      const mapContainer = container.querySelector('#map-interactive-container');
      const svgEl = container.querySelector('#world-svg-root');
      if (!mapContainer || !svgEl || typeof window.d3 === 'undefined') return;

      const rect = mapContainer.getBoundingClientRect();
      const width = rect.width || 900;
      const height = rect.height || 520;
      this.containerWidth = width;
      this.containerHeight = height;

      // 1. Setup Equal Earth / Natural Earth projection centered on globe
      this.projection = window.d3.geoNaturalEarth1()
        .fitSize([width, height], geoData);

      this.pathGenerator = window.d3.geoPath().projection(this.projection);

      // Clear SVG
      const svg = window.d3.select(svgEl)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('width', '100%')
        .attr('height', '100%');

      this.svg = svg;

      // Create root group for pan/zoom transforms
      const gRoot = svg.append('g').attr('id', 'map-transform-root');
      this.gRoot = gRoot;

      // 2. Render Subtle Graticule (Lat/Long lines)
      const graticule = window.d3.geoGraticule10();
      gRoot.append('path')
        .datum(graticule)
        .attr('class', 'graticule')
        .attr('d', this.pathGenerator)
        .attr('fill', 'none')
        .attr('stroke', 'var(--map-grid-line)')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2 2')
        .attr('pointer-events', 'none');

      // 3. Render Shipping Lanes & Trade Routes Group
      const gRoutes = gRoot.append('g').attr('id', 'map-shipping-routes');
      this.renderShippingRoutes(gRoutes);

      // 4. Render Active Bilateral Trade Lines Group
      const gBilateral = gRoot.append('g').attr('id', 'map-bilateral-trade-lines');
      this.renderBilateralTradeLines(gBilateral, state);

      // 5. Render Country Polygons
      const gCountries = gRoot.append('g').attr('id', 'map-countries-layer');
      
      const self = this;
      const tooltip = container.querySelector('#map-floating-tooltip');

      gCountries.selectAll('path.country-path')
        .data(geoData.features)
        .enter()
        .append('path')
        .attr('class', d => {
          const iso = this.getFeatureIso(d);
          const isPlayer = (iso === state.playerCountryId);
          const isSelected = (iso === this.selectedInspectId);
          return `country-path ${isPlayer ? 'player-country' : ''} ${isSelected ? 'selected-country' : ''}`;
        })
        .attr('d', this.pathGenerator)
        .attr('fill', d => {
          const iso = this.getFeatureIso(d);
          const country = state.countries[iso];
          return this.getCountryColor(country, playerCountry);
        })
        .attr('data-iso', d => this.getFeatureIso(d))
        .on('mouseenter', function (event, d) {
          const iso = self.getFeatureIso(d);
          const country = state.countries[iso];
          const name = country ? country.namePl : d.properties.name;
          const flag = country ? country.flag : '🌐';
          
          if (tooltip) {
            tooltip.style.display = 'flex';
            if (country) {
              const NF = window.WorldForge.Core.NumberFormat;
              tooltip.innerHTML = `
                <div style="font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                  <span>${flag}</span> <span>${name} (${iso})</span>
                </div>
                <div style="font-size: 10px; color: var(--text-secondary);">Stolica: ${country.capital} • ${country.region}</div>
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
                  PKB: <strong class="font-mono text-positive">${NF.formatMoney(country.economy.gdpNominal)}</strong> • 
                  Dług: <strong class="font-mono">${country.debt.debtToGdp.toFixed(1)}%</strong>
                </div>
              `;
            } else {
              tooltip.innerHTML = `
                <div style="font-weight: 600; color: var(--text-primary);">${name} (${iso})</div>
                <div style="font-size: 10px; color: var(--text-muted);">${d.properties.continent || ''}</div>
              `;
            }
          }
        })
        .on('mousemove', function (event) {
          if (tooltip) {
            const containerRect = mapContainer.getBoundingClientRect();
            tooltip.style.left = `${event.clientX - containerRect.left + 14}px`;
            tooltip.style.top = `${event.clientY - containerRect.top + 14}px`;
          }
        })
        .on('mouseleave', function () {
          if (tooltip) tooltip.style.display = 'none';
        })
        .on('click', function (event, d) {
          event.stopPropagation();
          const iso = self.getFeatureIso(d);
          self.selectCountry(iso, container);
        });

      // 6. Interactive Click Targets for Small States & Island Nations
      const gSmallTargets = gRoot.append('g').attr('id', 'map-small-state-targets');
      this.renderSmallStateTargets(gSmallTargets, geoData, state);

      // 7. Render Strategic Infrastructure & Military Nodes
      const gNodes = gRoot.append('g').attr('id', 'map-strategic-nodes');
      this.renderStrategicNodes(gNodes, state);

      // 8. Render Dynamic Smart Labels
      const gLabels = gRoot.append('g').attr('id', 'map-labels-layer');
      this.renderSmartLabels(gLabels, geoData, state);

      // 9. D3 Zoom & Pan Setup
      const zoom = window.d3.zoom()
        .scaleExtent([0.85, 12.0])
        .on('zoom', (event) => {
          this.currentTransform = event.transform;
          gRoot.attr('transform', event.transform);
          this.updateLabelVisibility(event.transform.k);
        });

      this.zoomBehavior = zoom;
      svg.call(zoom);

      // Restore zoom if already set
      if (this.currentTransform) {
        svg.call(zoom.transform, this.currentTransform);
      }

      this.bindToolbarButtons(container);
    },

    getFeatureIso(feature) {
      if (!feature) return 'UNK';
      const props = feature.properties || {};
      const iso = feature.id || props.iso_a3 || props.ISO_A3 || props.ADM0_A3 || props.GU_A3;
      if (iso === '-99' || !iso) {
        return props.name === 'Norway' ? 'NOR' : (props.name === 'France' ? 'FRA' : 'UNK');
      }
      return iso;
    },

    renderShippingRoutes(gRoutes) {
      const routes = window.WorldForge.Data.WorldMapData?.shippingRoutes || [];
      const lineGen = window.d3.line()
        .x(d => this.projection(d)[0])
        .y(d => this.projection(d)[1])
        .curve(window.d3.curveCatmullRom.alpha(0.5));

      const showRoutes = ['trade', 'infrastructure'].includes(this.colorMode);
      gRoutes.style('display', showRoutes ? 'block' : 'none');

      gRoutes.selectAll('path.map-trade-line')
        .data(routes)
        .enter()
        .append('path')
        .attr('class', 'map-trade-line')
        .attr('d', r => lineGen(r.waypoints))
        .append('title')
        .text(r => r.name);
    },

    renderBilateralTradeLines(gBilateral, state) {
      const deals = state.bilateralDeals || [];
      const capitals = window.WorldForge.Data.WorldMapData?.capitals || {};
      
      const showTradeLines = (this.colorMode === 'trade');
      gBilateral.style('display', showTradeLines ? 'block' : 'none');

      const tradePairs = deals.map(deal => {
        const c1 = capitals[deal.exporterId];
        const c2 = capitals[deal.importerId];
        if (c1 && c2) {
          return {
            id: deal.id,
            source: c1.coords,
            target: c2.coords,
            resourceId: deal.resourceId,
            amount: deal.monthlyAmount
          };
        }
        return null;
      }).filter(Boolean);

      const lineGen = window.d3.line()
        .x(d => this.projection(d)[0])
        .y(d => this.projection(d)[1])
        .curve(window.d3.curveBasis);

      gBilateral.selectAll('path.bilateral-trade-vector')
        .data(tradePairs)
        .enter()
        .append('path')
        .attr('class', 'bilateral-trade-vector')
        .attr('d', d => {
          const p1 = d.source;
          const p2 = d.target;
          const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 + 8]; // arc curve
          return lineGen([p1, mid, p2]);
        })
        .attr('stroke', '#ad864a')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 2')
        .attr('fill', 'none')
        .attr('opacity', 0.85);
    },

    renderSmallStateTargets(gSmallTargets, geoData, state) {
      const smallIsoList = ['SGP', 'ISR', 'CHE', 'NLD', 'ARE', 'CYP', 'MLT', 'QAT', 'BHR', 'KWT'];
      const capitals = window.WorldForge.Data.WorldMapData?.capitals || {};
      const self = this;

      const smallData = smallIsoList.map(iso => {
        const c = state.countries[iso];
        const cap = capitals[iso];
        if (c && cap && this.projection) {
          const pt = this.projection(cap.coords);
          return { iso, country: c, pt };
        }
        return null;
      }).filter(Boolean);

      gSmallTargets.selectAll('circle.small-state-target')
        .data(smallData)
        .enter()
        .append('circle')
        .attr('class', 'small-state-target')
        .attr('cx', d => d.pt[0])
        .attr('cy', d => d.pt[1])
        .attr('r', 3.5)
        .attr('fill', 'var(--accent)')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.75)
        .attr('opacity', 0.85)
        .attr('cursor', 'pointer')
        .on('click', function (event, d) {
          event.stopPropagation();
          self.selectCountry(d.iso, document.getElementById('map-interactive-container'));
        });
    },

    renderStrategicNodes(gNodes, state) {
      const mapData = window.WorldForge.Data.WorldMapData;
      if (!mapData || !this.projection) return;

      // Deepwater Seaports
      if (['infrastructure', 'trade'].includes(this.colorMode) && mapData.ports) {
        gNodes.selectAll('circle.node-port')
          .data(mapData.ports)
          .enter()
          .append('circle')
          .attr('class', 'node-port')
          .attr('cx', d => this.projection(d.coords)[0])
          .attr('cy', d => this.projection(d.coords)[1])
          .attr('r', 2.5)
          .attr('fill', 'var(--map-port-node)')
          .attr('stroke', '#14181c')
          .attr('stroke-width', 0.75)
          .append('title')
          .text(d => `Głęboki Port Morski: ${d.name}`);
      }

      // Energy Complexes
      if (this.colorMode === 'energy' && mapData.energyNodes) {
        gNodes.selectAll('rect.node-energy')
          .data(mapData.energyNodes)
          .enter()
          .append('rect')
          .attr('class', 'node-energy')
          .attr('x', d => this.projection(d.coords)[0] - 2.5)
          .attr('y', d => this.projection(d.coords)[1] - 2.5)
          .attr('width', 5)
          .attr('height', 5)
          .attr('fill', 'var(--map-energy-node)')
          .attr('stroke', '#14181c')
          .attr('stroke-width', 0.75)
          .append('title')
          .text(d => `Węzeł Energetyczny: ${d.name} (${d.type})`);
      }

      // Military Deterrence Hubs
      if (this.colorMode === 'military') {
        const capitals = mapData.capitals || {};
        const milData = Object.entries(state.countries).map(([iso, c]) => {
          const cap = capitals[iso];
          if (cap && c.military) {
            return {
              iso,
              namePl: c.namePl,
              score: c.military.deterrenceScore,
              coords: cap.coords
            };
          }
          return null;
        }).filter(Boolean);

        gNodes.selectAll('polygon.node-military')
          .data(milData)
          .enter()
          .append('polygon')
          .attr('class', 'node-military')
          .attr('points', d => {
            const pt = this.projection(d.coords);
            return `${pt[0]},${pt[1] - 4} ${pt[0] + 3},${pt[1] + 2} ${pt[0] - 3},${pt[1] + 2}`;
          })
          .attr('fill', 'var(--map-military-base)')
          .attr('stroke', '#14181c')
          .attr('stroke-width', 0.5)
          .append('title')
          .text(d => `Sztab Sił Zbrojnych: ${d.namePl} (Odstraszanie: ${d.score}/100)`);
      }
    },

    renderSmartLabels(gLabels, geoData, state) {
      const self = this;
      const labelData = [];

      geoData.features.forEach(feat => {
        const iso = self.getFeatureIso(feat);
        const country = state.countries[iso];
        if (!country) return;

        const centroid = self.pathGenerator.centroid(feat);
        if (centroid && !Number.isNaN(centroid[0]) && !Number.isNaN(centroid[1])) {
          // Rank importance to avoid clutter when zoomed out
          const gdp = country.economy.gdpNominal;
          const pop = country.population.total;
          let minZoom = 1.0;
          
          if (['USA', 'CHN', 'RUS', 'CAN', 'BRA', 'AUS', 'IND'].includes(iso)) {
            minZoom = 0.9;
          } else if (['POL', 'DEU', 'FRA', 'GBR', 'JPN', 'SAU', 'EGY', 'ZAF', 'MEX', 'ARG', 'TUR', 'KOR', 'UKR'].includes(iso)) {
            minZoom = 1.4;
          } else {
            minZoom = 2.4;
          }

          labelData.push({
            iso,
            name: country.namePl,
            x: centroid[0],
            y: centroid[1],
            minZoom
          });
        }
      });

      gLabels.selectAll('text.country-label')
        .data(labelData)
        .enter()
        .append('text')
        .attr('class', 'country-label')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#9da6af')
        .attr('font-size', '8px')
        .attr('font-family', 'var(--font-sans)')
        .attr('font-weight', '500')
        .attr('pointer-events', 'none')
        .attr('opacity', d => (d.minZoom <= 1.0 ? 0.9 : 0))
        .attr('data-min-zoom', d => d.minZoom)
        .text(d => d.name);
    },

    updateLabelVisibility(k) {
      if (!this.svg) return;
      this.svg.selectAll('text.country-label').each(function () {
        const minZ = parseFloat(this.getAttribute('data-min-zoom') || 1.0);
        this.setAttribute('opacity', k >= minZ ? '0.9' : '0');
        // Scale font size down proportionally as zoom increases to stay crisp
        const fontSize = Math.max(5, Math.min(10, 8 / Math.sqrt(k)));
        this.setAttribute('font-size', `${fontSize.toFixed(1)}px`);
      });
    },

    selectCountry(iso, container) {
      this.selectedInspectId = iso;
      const state = window.WorldForge.Core.GameState.getState();

      // Update path styling
      if (this.svg) {
        this.svg.selectAll('path.country-path').each(function () {
          const pathIso = this.getAttribute('data-iso');
          const isPlayer = (pathIso === state.playerCountryId);
          const isSelected = (pathIso === iso);
          this.setAttribute('class', `country-path ${isPlayer ? 'player-country' : ''} ${isSelected ? 'selected-country' : ''}`);
        });
      }

      window.WorldForge.UI.App.onCountrySelectedOnMap(iso);
    },

    focusCountry(iso) {
      const geoData = window.WorldForge.Data.worldGeography;
      if (!geoData || !this.svg || !this.zoomBehavior || !this.pathGenerator) return;

      const feat = geoData.features.find(f => this.getFeatureIso(f) === iso);
      if (!feat) return;

      const bounds = this.pathGenerator.bounds(feat);
      const dx = bounds[1][0] - bounds[0][0];
      const dy = bounds[1][1] - bounds[0][1];
      const x = (bounds[0][0] + bounds[1][0]) / 2;
      const y = (bounds[0][1] + bounds[1][1]) / 2;

      const scale = Math.max(1, Math.min(6, 0.85 / Math.max(dx / this.containerWidth, dy / this.containerHeight)));
      const translate = [this.containerWidth / 2 - scale * x, this.containerHeight / 2 - scale * y];

      this.svg.transition().duration(750).call(
        this.zoomBehavior.transform,
        window.d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );

      this.selectCountry(iso, document.getElementById('map-interactive-container'));
    },

    getCountryColor(country, playerCountry) {
      if (!country) return '#2a3130';
      const isPlayer = (country.id === playerCountry?.id);

      switch (this.colorMode) {
        case 'political':
          if (isPlayer) return '#3b5a70'; // Muted steel blue player country
          return '#313837'; // Natural subdued terrain

        case 'economic': {
          const gdpPerCap = country.economy.gdpPerCapita;
          if (gdpPerCap > 50000) return '#476852'; // Muted forest green
          if (gdpPerCap > 25000) return '#4a6058';
          if (gdpPerCap > 10000) return '#4a575b';
          if (gdpPerCap > 4000) return '#545550';
          return '#484443';
        }

        case 'population': {
          const pop = country.population.total;
          if (pop > 500000000) return '#6b5443';
          if (pop > 100000000) return '#5c524b';
          if (pop > 35000000) return '#474c4d';
          return '#343c3a';
        }

        case 'trade': {
          const topDependency = country.production ? Math.max(...Object.values(country.production).map(p => p.dependencyOnTopSupplierPercent || 0)) : 20;
          if (topDependency > 70) return '#634241'; // High dependency risk
          if (topDependency > 40) return '#5e5140';
          return '#3d4d48';
        }

        case 'energy': {
          const clean = country.energy?.cleanEnergyShare || 30;
          if (clean > 50) return '#42634e';
          if (clean > 30) return '#495a56';
          return '#5c4e40';
        }

        case 'infrastructure': {
          const road = country.infrastructure?.roadQuality || 70;
          if (road > 85) return '#44606f';
          if (road > 70) return '#47535b';
          return '#484545';
        }

        case 'military': {
          const det = country.military?.deterrenceScore || 50;
          if (det > 80) return '#5e3e3e';
          if (det > 50) return '#504b49';
          return '#373d3c';
        }

        case 'diplomacy': {
          if (isPlayer) return '#3b5a70';
          const rel = playerCountry?.diplomacy?.relations[country.id] || 0;
          if (rel > 50) return '#3b6145'; // Ally
          if (rel > 15) return '#41524d'; // Friendly
          if (rel > -20) return '#394042'; // Neutral
          if (rel > -50) return '#54463d'; // Chilly
          return '#593b3b'; // Hostile
        }

        default:
          return '#313837';
      }
    },

    renderLegendHtml() {
      switch (this.colorMode) {
        case 'political':
          return `
            <div class="map-legend-title">Warstwa 1: Polityczna</div>
            <div class="map-legend-items">
              <div class="map-legend-row"><span class="map-legend-color" style="background: #3b5a70;"></span> <span>Twoje Państwo</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #313837;"></span> <span>Suwerenne Państwa Świata</span></div>
            </div>
          `;
        case 'economic':
          return `
            <div class="map-legend-title">Warstwa 2: PKB per Capita</div>
            <div class="map-legend-items">
              <div class="map-legend-row"><span class="map-legend-color" style="background: #476852;"></span> <span>> $50 000</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #4a6058;"></span> <span>$25 000 - $50 000</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #4a575b;"></span> <span>$10 000 - $25 000</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #484443;"></span> <span>< $10 000</span></div>
            </div>
          `;
        case 'population':
          return `
            <div class="map-legend-title">Warstwa 3: Zaludnienie</div>
            <div class="map-legend-items">
              <div class="map-legend-row"><span class="map-legend-color" style="background: #6b5443;"></span> <span>> 500 mln</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #5c524b;"></span> <span>100 - 500 mln</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #474c4d;"></span> <span>35 - 100 mln</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #343c3a;"></span> <span>< 35 mln</span></div>
            </div>
          `;
        case 'trade':
          return `
            <div class="map-legend-title">Warstwa 4: Szlaki i Zależności</div>
            <div class="map-legend-items">
              <div class="map-legend-row"><span class="map-legend-color" style="background: #3d4d48;"></span> <span>Niezależność (<40%)</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #634241;"></span> <span>Wysokie uzależnienie (>70%)</span></div>
              <div class="map-legend-row"><span style="border-bottom: 2px dashed #ad864a; width: 10px; display: inline-block;"></span> <span>Szlaki morskie i kontrakty</span></div>
            </div>
          `;
        case 'energy':
          return `
            <div class="map-legend-title">Warstwa 5: Miks Energetyczny</div>
            <div class="map-legend-items">
              <div class="map-legend-row"><span class="map-legend-color" style="background: #42634e;"></span> <span>> 50% OZE / Atom</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #5c4e40;"></span> <span>Dominacja paliw kopalnych</span></div>
              <div class="map-legend-row"><span style="display:inline-block; width:6px; height:6px; background:#ad864a; border:1px solid #000;"></span> <span>Węzły KSE / Elektrownie</span></div>
            </div>
          `;
        case 'infrastructure':
          return `
            <div class="map-legend-title">Warstwa 6: Infrastruktura</div>
            <div class="map-legend-items">
              <div class="map-legend-row"><span class="map-legend-color" style="background: #44606f;"></span> <span>Wysoka (Autostrady/KDP)</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #484545;"></span> <span>Standardowa / Rozwijająca się</span></div>
              <div class="map-legend-row"><span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#5e829c;"></span> <span>Głębokie Porty Morskie</span></div>
            </div>
          `;
        case 'military':
          return `
            <div class="map-legend-title">Warstwa 7: Odstraszanie</div>
            <div class="map-legend-items">
              <div class="map-legend-row"><span class="map-legend-color" style="background: #5e3e3e;"></span> <span>Potęga militarna (>80)</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #373d3c;"></span> <span>Standardowa obrona</span></div>
              <div class="map-legend-row"><span style="display:inline-block; width:0; height:0; border-left:4px solid transparent; border-right:4px solid transparent; border-bottom:6px solid #9e5554;"></span> <span>Dowództwa Sił Zbrojnych</span></div>
            </div>
          `;
        case 'diplomacy':
          return `
            <div class="map-legend-title">Warstwa 8: Relacje z Tobą</div>
            <div class="map-legend-items">
              <div class="map-legend-row"><span class="map-legend-color" style="background: #3b6145;"></span> <span>Sojusznik (+50 do +100)</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #394042;"></span> <span>Neutralny (-20 do +15)</span></div>
              <div class="map-legend-row"><span class="map-legend-color" style="background: #593b3b;"></span> <span>Wrogi (-50 do -100)</span></div>
            </div>
          `;
        default:
          return '';
      }
    },

    bindToolbarButtons(container) {
      // Layer buttons
      container.querySelectorAll('#map-layer-selector button').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          this.colorMode = btn.getAttribute('data-layer');
          this.render(container);
        };
      });

      // Zoom +
      container.querySelector('#btn-map-zoom-in')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.svg && this.zoomBehavior) {
          this.svg.transition().duration(250).call(this.zoomBehavior.scaleBy, 1.35);
        }
      });

      // Zoom -
      container.querySelector('#btn-map-zoom-out')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.svg && this.zoomBehavior) {
          this.svg.transition().duration(250).call(this.zoomBehavior.scaleBy, 0.74);
        }
      });

      // Reset
      container.querySelector('#btn-map-zoom-reset')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.svg && this.zoomBehavior) {
          this.currentTransform = window.d3.zoomIdentity;
          this.svg.transition().duration(350).call(this.zoomBehavior.transform, window.d3.zoomIdentity);
        }
      });

      // Window resize listener
      window.addEventListener('resize', () => {
        const mapContainer = container.querySelector('#map-interactive-container');
        if (mapContainer) {
          const rect = mapContainer.getBoundingClientRect();
          if (rect.width > 100 && rect.height > 100) {
            this.containerWidth = rect.width;
            this.containerHeight = rect.height;
            if (this.projection && window.WorldForge.Data.worldGeography) {
              this.projection.fitSize([rect.width, rect.height], window.WorldForge.Data.worldGeography);
              if (this.svg) {
                this.svg.attr('viewBox', `0 0 ${rect.width} ${rect.height}`);
                this.render(container);
              }
            }
          }
        }
      });
    }
  };

  window.WorldForge.UI.WorldMap = WorldMapUI;
})();
