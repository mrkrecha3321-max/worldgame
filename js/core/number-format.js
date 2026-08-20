/**
 * WorldForge: Nations - Central Number & Currency Formatter
 * Strict Polish linguistic scale (tys., mln, mld, bln, bld), no English abbreviations (k, M, B, T).
 * Operates on full exact integer/float base units.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  const NumberFormat = {
    // Current display currency mode: 'LOCAL' | 'USD' | 'EUR'
    displayCurrencyMode: 'LOCAL',

    setDisplayCurrencyMode(mode) {
      if (['LOCAL', 'USD', 'EUR'].includes(mode)) {
        this.displayCurrencyMode = mode;
      }
    },

    /**
     * Convert value to target display currency if needed
     * @param {number} amount
     * @param {string} sourceCurrency
     * @param {number} exchangeRateVsUsd - Units of domestic currency per 1 USD
     * @returns {{ convertedAmount: number, targetCurrency: string, isConverted: boolean }}
     */
    convertForDisplay(amount, sourceCurrency = 'USD', exchangeRateVsUsd = 1.0) {
      const mode = this.displayCurrencyMode;
      const num = Number(amount) || 0;
      const eurPerUsd = 0.92; // 1 USD = 0.92 EUR

      if (mode === 'USD') {
        if (sourceCurrency === 'USD') {
          return { convertedAmount: num, targetCurrency: 'USD', isConverted: false };
        }
        // Convert domestic currency to USD
        const inUsd = num / (exchangeRateVsUsd || 1.0);
        return { convertedAmount: inUsd, targetCurrency: 'USD', isConverted: true };
      } else if (mode === 'EUR') {
        if (sourceCurrency === 'EUR') {
          return { convertedAmount: num, targetCurrency: 'EUR', isConverted: false };
        }
        // Convert to USD first, then to EUR
        const inUsd = (sourceCurrency === 'USD') ? num : (num / (exchangeRateVsUsd || 1.0));
        const inEur = inUsd * eurPerUsd;
        return { convertedAmount: inEur, targetCurrency: 'EUR', isConverted: true };
      } else {
        // 'LOCAL' mode: preserve domestic currency
        return { convertedAmount: num, targetCurrency: sourceCurrency, isConverted: false };
      }
    },

    /**
     * Format monetary value using strict Polish scale
     * @param {number} amount - Exact base amount (full integer in USD or source currency)
     * @param {string} currencyCode - 'USD', 'PLN', 'EUR', etc.
     * @param {Object} options - { decimals: 2, rawText: boolean, forceCurrency: boolean, exchangeRate: number }
     * @returns {string} - e.g. "683,92 mld USD" or HTML with tooltip
     */
    money(amount, currencyCode = 'USD', options = {}) {
      if (amount === null || amount === undefined || Number.isNaN(amount)) {
        return `0 ${currencyCode}`;
      }

      let num = Number(amount);
      let targetCurr = currencyCode;

      // Handle display currency mode conversion if not forced
      if (!options.forceCurrency) {
        const conv = this.convertForDisplay(num, currencyCode, options.exchangeRate || 1.0);
        num = conv.convertedAmount;
        targetCurr = conv.targetCurrency;
      }

      const decimals = options.decimals !== undefined ? options.decimals : 2;
      const abs = Math.abs(num);
      const sign = num < 0 ? '-' : '';

      // Polish linguistic scale
      let scaledValue = abs;
      let suffix = '';

      if (abs >= 1e15) {
        scaledValue = abs / 1e15;
        suffix = ' bld';
      } else if (abs >= 1e12) {
        scaledValue = abs / 1e12;
        suffix = ' bln';
      } else if (abs >= 1e9) {
        scaledValue = abs / 1e9;
        suffix = ' mld';
      } else if (abs >= 1e6) {
        scaledValue = abs / 1e6;
        suffix = ' mln';
      } else if (abs >= 1e3) {
        scaledValue = abs / 1e3;
        suffix = ' tys.';
      }

      const formattedNumber = scaledValue.toLocaleString('pl-PL', {
        minimumFractionDigits: suffix ? decimals : 0,
        maximumFractionDigits: suffix ? decimals : 2
      });

      const exactFormatted = this.exactMoney(num, targetCurr);
      const textOutput = `${sign}${formattedNumber}${suffix} ${targetCurr}`;

      if (options.rawText) {
        return textOutput;
      }

      // Return text with exact number tooltip
      return `<span class="wf-money-value" title="${exactFormatted}">${textOutput}</span>`;
    },

    /**
     * Format exact full number with thousand spaces and currency (e.g. "683 920 000 000 USD")
     */
    exactMoney(amount, currencyCode = 'USD') {
      if (amount === null || amount === undefined || Number.isNaN(amount)) {
        return `0 ${currencyCode}`;
      }
      const rounded = Math.round(Number(amount));
      const formatted = rounded.toLocaleString('pl-PL');
      return `${formatted} ${currencyCode}`;
    },

    /**
     * Format compact Polish number (e.g. "37,70 mln")
     */
    number(value, options = {}) {
      if (value === null || value === undefined || Number.isNaN(value)) return '0';
      const decimals = options.decimals !== undefined ? options.decimals : 2;
      const num = Number(value);
      const abs = Math.abs(num);
      const sign = num < 0 ? '-' : '';

      let scaled = abs;
      let suffix = '';

      if (abs >= 1e15) { scaled = abs / 1e15; suffix = ' bld'; }
      else if (abs >= 1e12) { scaled = abs / 1e12; suffix = ' bln'; }
      else if (abs >= 1e9) { scaled = abs / 1e9; suffix = ' mld'; }
      else if (abs >= 1e6) { scaled = abs / 1e6; suffix = ' mln'; }
      else if (abs >= 1e3) { scaled = abs / 1e3; suffix = ' tys.'; }

      const formatted = scaled.toLocaleString('pl-PL', {
        minimumFractionDigits: suffix ? decimals : 0,
        maximumFractionDigits: suffix ? decimals : 2
      });

      const exact = Math.round(num).toLocaleString('pl-PL');
      const text = `${sign}${formatted}${suffix}`;

      if (options.rawText) return text;
      return `<span title="${exact}">${text}</span>`;
    },

    /**
     * Format exact integer with thousands spaces
     */
    exactNumber(value) {
      if (value === null || value === undefined || Number.isNaN(value)) return '0';
      return Math.round(Number(value)).toLocaleString('pl-PL');
    },

    /**
     * Format demographic population (e.g. "37,70 mln")
     */
    population(value, options = {}) {
      if (value === null || value === undefined || Number.isNaN(value)) return '0';
      return this.number(value, { decimals: 2, ...options });
    },

    /**
     * Format percentage (e.g. "+3,2%" or "5,4%")
     */
    percent(value, decimals = 1, showSign = false) {
      if (value === null || value === undefined || Number.isNaN(value)) return '0,0%';
      const num = Number(value);
      const sign = (showSign && num > 0) ? '+' : '';
      const formatted = num.toLocaleString('pl-PL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      return `${sign}${formatted}%`;
    },

    /**
     * Format financial or percentage delta with color class
     */
    delta(value, isPercent = false, currencyCode = 'USD') {
      const num = Number(value) || 0;
      const sign = num > 0 ? '+' : '';
      const colorClass = num > 0 ? 'text-positive' : (num < 0 ? 'text-negative' : 'text-muted');

      if (isPercent) {
        const text = `${sign}${num.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
        return `<span class="${colorClass}">${text}</span>`;
      }

      const formattedMoney = this.money(num, currencyCode, { decimals: 2 });
      return `<span class="${colorClass}">${formattedMoney}</span>`;
    },

    /**
     * Format production with unit (e.g. "12,5 tys. ton" or "450 GWh")
     */
    production(value, unit = 'ton') {
      if (value === null || value === undefined || Number.isNaN(value)) return `0 ${unit}`;
      const num = Number(value);
      const formatted = this.number(num, { decimals: 1, rawText: true });
      const exact = this.exactNumber(num);
      return `<span title="${exact} ${unit}">${formatted} ${unit}</span>`;
    },

    /**
     * Format Polish turn date
     */
    formatTurnDate(startDate, turnNumber = 1) {
      const date = new Date(startDate || Date.now());
      date.setMonth(date.getMonth() + Math.max(0, turnNumber - 1));

      const polishMonths = [
        'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
        'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
      ];
      const monthName = polishMonths[date.getMonth()];
      const year = date.getFullYear();

      return {
        formatted: `${monthName} ${year}`,
        monthName,
        year,
        monthIndex: date.getMonth(),
        turn: turnNumber,
        iso: date.toISOString().slice(0, 7)
      };
    },

    // Backward compatibility aliases
    formatMoney(amount, currency = 'USD', decimals = 2) {
      return this.money(amount, currency, { decimals });
    },
    formatPopulation(value) {
      return this.population(value);
    },
    formatPercent(value, decimals = 1, showPlus = false) {
      return this.percent(value, decimals, showPlus);
    },
    formatDelta(value, isPercent = false, decimals = 1) {
      return this.delta(value, isPercent);
    },
    formatInt(value) {
      return this.exactNumber(value);
    }
  };

  window.WorldForge.Format = NumberFormat;
  window.WorldForge.Core.NumberFormat = NumberFormat;
})();
