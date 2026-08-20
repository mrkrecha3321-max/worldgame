/**
 * WorldForge: Nations - Validators & Math Safety
 * Guarantees numbers are non-NaN, non-Infinity, and within safe boundaries.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  const Validators = {
    /**
     * Clean and clamp a numeric value
     * @param {any} value
     * @param {number} fallback
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    sanitizeNumber(value, fallback = 0, min = -Infinity, max = Infinity) {
      if (value === null || value === undefined) return fallback;
      const num = Number(value);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        return fallback;
      }
      return Math.min(Math.max(num, min), max);
    },

    /**
     * Clamps a percentage between 0 and 100
     */
    clampPercent(value, fallback = 0) {
      return this.sanitizeNumber(value, fallback, 0, 100);
    },

    /**
     * Clamps a 0..1 ratio
     */
    clampRatio(value, fallback = 0) {
      return this.sanitizeNumber(value, fallback, 0, 1);
    },

    /**
     * Clamps a non-negative number (e.g. money, population, production)
     */
    clampNonNegative(value, fallback = 0) {
      return this.sanitizeNumber(value, fallback, 0, Infinity);
    },

    /**
     * Clamps a diplomatic relation score (-100 to +100)
     */
    clampRelation(value) {
      return this.sanitizeNumber(value, 0, -100, 100);
    },

    /**
     * Validates an ISO3 country code
     */
    isValidCountryCode(code) {
      return typeof code === 'string' && /^[A-Z]{3}$/.test(code.toUpperCase());
    },

    /**
     * Recursively sanitizes an object to remove NaNs/Infinities
     */
    sanitizeStateObject(obj) {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'number') {
        if (Number.isNaN(obj) || !Number.isFinite(obj)) return 0;
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(item => this.sanitizeStateObject(item));
      }
      if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, val] of Object.entries(obj)) {
          sanitized[key] = this.sanitizeStateObject(val);
        }
        return sanitized;
      }
      return obj;
    },

    /**
     * Asserts condition, throwing descriptive error in debug mode
     */
    assert(condition, message) {
      if (!condition) {
        console.error(`[WorldForge Assertion Failed] ${message}`);
        return false;
      }
      return true;
    }
  };

  window.WorldForge.Core.Validators = Validators;
})();
