/**
 * WorldForge: Nations - Custom Pure SVG & Canvas Charts
 * Professional data-dense visualizations with muted tones and zero glow.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.UI = window.WorldForge.UI || {};

  const ChartsUI = {
    /**
     * Create an SVG Sparkline / Area Chart
     * @param {Array<number>} data - Array of values
     * @param {number} width
     * @param {number} height
     * @param {string} strokeColor
     * @returns {string} - SVG string
     */
    createSparkline(data = [], width = 140, height = 30, strokeColor = '#5e829c') {
      if (!data || data.length < 2) {
        return `<svg width="${width}" height="${height}"><text x="4" y="18" fill="#67727e" font-size="9">Brak danych</text></svg>`;
      }

      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min === 0 ? 1 : max - min;
      const padding = 2;
      const effectiveW = width - padding * 2;
      const effectiveH = height - padding * 2;

      const points = data.map((val, idx) => {
        const x = padding + (idx / (data.length - 1)) * effectiveW;
        const y = padding + effectiveH - ((val - min) / range) * effectiveH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      const pathData = `M ${points.join(' L ')}`;

      return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
          <path d="${pathData}" fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `;
    },

    /**
     * Create an SVG Donut Chart
     * @param {Array<{label: string, value: number, color: string}>} segments
     * @param {number} size
     */
    createDonutChart(segments = [], size = 110) {
      const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
      if (total <= 0) return `<svg width="${size}" height="${size}"></svg>`;

      const center = size / 2;
      const radius = size * 0.38;
      const strokeWidth = size * 0.16;
      const circumference = 2 * Math.PI * radius;

      let accumulatedAngle = 0;
      const paths = segments.map(seg => {
        const value = Math.max(0, seg.value);
        const percent = value / total;
        const strokeDasharray = `${(percent * circumference).toFixed(1)} ${circumference.toFixed(1)}`;
        const strokeDashoffset = (-accumulatedAngle * circumference).toFixed(1);
        accumulatedAngle += percent;

        return `
          <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent"
                  stroke="${seg.color}" stroke-width="${strokeWidth}"
                  stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"
                  transform="rotate(-90 ${center} ${center})">
            <title>${seg.label}: ${value} (${(percent * 100).toFixed(1)}%)</title>
          </circle>
        `;
      }).join('');

      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          ${paths}
        </svg>
      `;
    },

    /**
     * Create an SVG Radar / Spider Chart
     * @param {Array<{axis: string, value: number}>} data - values 0..100
     * @param {number} size
     */
    createRadarChart(data = [], size = 180) {
      if (!data || data.length < 3) return '';

      const center = size / 2;
      const radius = size * 0.36;
      const totalAxes = data.length;
      const angleSlice = (Math.PI * 2) / totalAxes;

      // Concentric background grid
      const levels = [0.33, 0.66, 1.0];
      const gridCircles = levels.map(level => {
        const r = radius * level;
        return `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#2e3640" stroke-width="1" />`;
      }).join('');

      // Axes lines and labels
      let axesHtml = '';
      const polygonPoints = [];

      data.forEach((d, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        axesHtml += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#2e3640" stroke-width="1" />`;

        // Label
        const labelX = center + (radius + 14) * Math.cos(angle);
        const labelY = center + (radius + 14) * Math.sin(angle);
        axesHtml += `<text x="${labelX}" y="${labelY}" fill="#67727e" font-size="8" text-anchor="middle" dominant-baseline="central">${d.axis}</text>`;

        // Value point
        const valRatio = Math.min(100, Math.max(0, d.value)) / 100;
        const valX = center + radius * valRatio * Math.cos(angle);
        const valY = center + radius * valRatio * Math.sin(angle);
        polygonPoints.push(`${valX.toFixed(1)},${valY.toFixed(1)}`);
      });

      const polygonPath = `M ${polygonPoints.join(' L ')} Z`;

      return `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="overflow: visible;">
          ${gridCircles}
          ${axesHtml}
          <path d="${polygonPath}" fill="rgba(94, 130, 156, 0.2)" stroke="#5e829c" stroke-width="1.5" />
        </svg>
      `;
    }
  };

  window.WorldForge.UI.Charts = ChartsUI;
})();
