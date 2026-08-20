/**
 * WorldForge: Nations - Main Application Bootstrap
 * Connects systems, initializes namespace, and starts UI runtime.
 */
(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', () => {
    console.log(`[WorldForge Main] Bootstrapping ${window.WorldForge.GAME_TITLE}...`);

    // 1. Initialize UI Orchestrator
    if (window.WorldForge.UI.App) {
      window.WorldForge.UI.App.init();
    }

    // 2. Render Start Screen
    if (window.WorldForge.UI.StartScreen) {
      window.WorldForge.UI.StartScreen.show();
    }

    // 3. Check for Diagnostic / Debug Mode
    if (window.WorldForge.Tests.SelfTests) {
      window.WorldForge.Tests.SelfTests.showDebugPanel();

      if (window.location.search.includes('test=1')) {
        console.log('[WorldForge] Running auto-tests triggered by ?test=1');
        window.WorldForge.Tests.SelfTests.runAll();
      }
    }

    console.log('[WorldForge Main] Ready for simulation.');
  });
})();
