/**
 * WorldForge: Nations - Core Namespace & System Configuration
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};

  // Subsystems
  window.WorldForge.Core = window.WorldForge.Core || {};
  window.WorldForge.Data = window.WorldForge.Data || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};
  window.WorldForge.UI = window.WorldForge.UI || {};
  window.WorldForge.Tests = window.WorldForge.Tests || {};

  // Version and metadata
  window.WorldForge.VERSION = '2.0.0';
  window.WorldForge.GAME_TITLE = 'WorldForge: Nations';
  window.WorldForge.SUBTITLE = 'Global State Simulator';

  // Game configuration constants
  window.WorldForge.CONFIG = {
    DEFAULT_TURN_SECONDS: 180,
    MONTHS_PER_YEAR: 12,
    MAX_COMMAND_HISTORY: 500,
    MAX_NOTIFICATION_HISTORY: 100,
    SAVE_VERSION: 2,
    SAVE_KEY_PREFIX: 'worldforge_nations_save_',
    MAX_MONTHLY_GDP_GROWTH_LIMIT: 0.05, // 5% max monthly swing guard
    MAX_MONTHLY_GDP_DROP_LIMIT: -0.05,  // -5% max monthly swing guard
    DEFAULT_GLOBAL_INFLATION: 2.5,
    MIN_INTEREST_RATE: 0.0,
    MAX_INTEREST_RATE: 45.0,
    MAX_TAX_RATE: 85.0
  };

  console.log(`[WorldForge] Initialized ${window.WorldForge.GAME_TITLE} v${window.WorldForge.VERSION}`);
})();
