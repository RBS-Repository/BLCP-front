/**
 * Utility functions to ensure back/forward cache (bfcache) works correctly
 * This helps improve performance when users navigate with browser back/forward buttons
 */

/**
 * Initializes optimizations for back/forward cache
 * Call this function in your root component
 */
export const initBfCacheOptimizer = () => {
  // Check if bfcache is supported via performance navigation type
  const isBfCacheSupported = 'PerformanceNavigationTiming' in window;
  
  // Make sure we don't run this multiple times
  if (window.__BF_CACHE_OPTIMIZER_INITIALIZED) {
    return isBfCacheSupported;
  }
  
  // Mark as initialized
  window.__BF_CACHE_OPTIMIZER_INITIALIZED = true;
  
  // Remove known bfcache blockers - do this safely 
  try {
    removeBfCacheBlockers();
  } catch (e) {
    console.warn('Error removing bfcache blockers:', e);
  }
  
  // Use a safer approach to add event listeners
  const safeAddEventListener = (target, type, listener, options) => {
    try {
      target.addEventListener(type, listener, options);
    } catch (e) {
      console.warn(`Error adding ${type} listener:`, e);
    }
  };
  
  // Listen for page show/hide events to properly handle state
  safeAddEventListener(window, 'pageshow', (event) => {
    // If the page is loaded from bfcache
    if (event.persisted) {
      console.log('Page restored from bfcache');
      // Trigger any needed state refresh here
      try {
        refreshStaleData();
      } catch (e) {
        console.warn('Error refreshing stale data:', e);
      }
    }
  });
  
  // Report bfcache events for analytics/debugging
  try {
    reportBfCacheEvents();
  } catch (e) {
    console.warn('Error setting up bfcache reporting:', e);
  }
  
  return isBfCacheSupported;
};

/**
 * Remove common issues that prevent bfcache from working
 */
const removeBfCacheBlockers = () => {
  // DON'T directly remove unload listeners - this can cause issues
  // Instead, use a more targeted approach
  
  // 1. Safe way to handle beforeunload
  const beforeUnloadListener = (event) => {
    // Only prevent unload if user has unsaved changes 
    const hasUnsavedChanges = false; // Should be replaced with actual logic
    
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
      return '';
    }
    
    return null;
  };
  
  // Only add beforeunload for forms or pages with editable content when needed
  // window.addEventListener('beforeunload', beforeUnloadListener);
};

/**
 * Report bfcache events for analytics and debugging
 */
const reportBfCacheEvents = () => {
  // Report when page is restored from bfcache
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // Could send analytics event here
      console.info('Page was loaded from bfcache');
    }
  });
  
  // Report when page is stored in bfcache
  window.addEventListener('pagehide', (event) => {
    // persisted flag will be true if page is eligible for bfcache
    if (event.persisted) {
      console.info('Page might be stored in bfcache');
    }
  });
};

/**
 * Refresh any data that might be stale when restoring from bfcache
 */
const refreshStaleData = () => {
  // Schedule this with setTimeout to avoid immediate execution
  // This helps prevent conflicts with React's scheduler
  setTimeout(() => {
    // Refresh any time-sensitive data
    // For example:
    
    // 1. Re-fetch API data that might be stale
    // 2. Update timers or countdowns
    // 3. Re-establish WebSocket connections
    // 4. Clear any sensitive form data
    
    // This should be customized based on your app's needs
  }, 0);
};

/**
 * Handler for SPA navigation to optimize for bfcache
 * Call this when route changes in your SPA router
 */
export const handleRouteChange = () => {
  // Clear unnecessary timers
  // Release resources that might prevent bfcache
  // Pause media playback
  
  // Example: Clear non-critical setTimeout/setInterval
  // window.clearTimeout(nonCriticalTimerId);
};

/**
 * Check if the page was restored from bfcache
 * Useful for conditional logic in components
 * @returns {boolean} - Whether the page was restored from bfcache
 */
export const wasRestoredFromBfCache = () => {
  if ('performance' in window && 'getEntriesByType' in performance) {
    const navigationEntries = performance.getEntriesByType('navigation');
    if (navigationEntries.length > 0) {
      return navigationEntries[0].type === 'back_forward';
    }
  }
  
  // Fallback if Navigation Timing API is not supported
  return false;
};

export default {
  initBfCacheOptimizer,
  handleRouteChange,
  wasRestoredFromBfCache
}; 