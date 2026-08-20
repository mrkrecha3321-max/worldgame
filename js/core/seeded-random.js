/**
 * WorldForge: Nations - Seeded Pseudo-Random Number Generator
 * Uses mulberry32 algorithm for deterministic, serializable randomness.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Core = window.WorldForge.Core || {};

  class SeededRandom {
    constructor(seed = 123456789) {
      this.initialSeed = seed;
      this.seed = seed;
    }

    /**
     * Set seed
     * @param {number} seed
     */
    setSeed(seed) {
      this.initialSeed = seed;
      this.seed = seed;
    }

    /**
     * Returns a float between 0 (inclusive) and 1 (exclusive)
     */
    next() {
      let t = (this.seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns a float between min and max
     */
    range(min, max) {
      return min + this.next() * (max - min);
    }

    /**
     * Returns an integer between min (inclusive) and max (inclusive)
     */
    rangeInt(min, max) {
      return Math.floor(this.range(min, max + 1));
    }

    /**
     * Returns true with given probability (0.0 - 1.0)
     */
    chance(probability) {
      return this.next() < probability;
    }

    /**
     * Returns a random element from an array
     */
    choice(array) {
      if (!array || array.length === 0) return null;
      const index = Math.floor(this.next() * array.length);
      return array[index];
    }

    /**
     * Weighted choice
     * @param {Array<{item: any, weight: number}>} weightedItems
     */
    weightedChoice(weightedItems) {
      if (!weightedItems || weightedItems.length === 0) return null;
      let totalWeight = 0;
      for (const item of weightedItems) {
        totalWeight += item.weight > 0 ? item.weight : 0;
      }
      if (totalWeight <= 0) return weightedItems[0].item;

      let r = this.next() * totalWeight;
      for (const item of weightedItems) {
        r -= Math.max(0, item.weight);
        if (r <= 0) {
          return item.item;
        }
      }
      return weightedItems[weightedItems.length - 1].item;
    }

    /**
     * Returns a number with Gaussian (normal) distribution (Box-Muller transform)
     */
    gaussian(mean = 0, stdev = 1) {
      let u = 1 - this.next();
      let v = this.next();
      let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return mean + z * stdev;
    }

    /**
     * Shuffle array in place
     */
    shuffle(array) {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    getState() {
      return {
        initialSeed: this.initialSeed,
        seed: this.seed
      };
    }

    restoreState(state) {
      if (state) {
        this.initialSeed = state.initialSeed || 123456789;
        this.seed = state.seed || this.initialSeed;
      }
    }
  }

  // Global instance
  window.WorldForge.Core.Random = new SeededRandom(Date.now());
  window.WorldForge.Core.SeededRandom = SeededRandom;
})();
