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
  
  // Remove known bfcache blockers
  removeBfCacheBlockers();
  
  // Listen for page show/hide events to properly handle state
  window.addEventListener('pageshow', (event) => {
    // If the page is loaded from bfcache
    if (event.persisted) {
      console.log('Page restored from bfcache');
      // Trigger any needed state refresh here
      refreshStaleData();
    }
  });
  
  // Report bfcache events for analytics/debugging
  reportBfCacheEvents();
  
  return isBfCacheSupported;
};

/**
 * Remove common issues that prevent bfcache from working
 */
const removeBfCacheBlockers = () => {
  // 1. Remove unload event listeners - these break bfcache
  window.removeEventListener('unload', () => {});
  
  // 2. Handle beforeunload carefully - only add when needed (forms, etc)
  const beforeUnloadListener = (event) => {
    // Only prevent unload if user has unsaved changes 
    const hasUnsavedChanges = false; // Should be replaced with actual logic
    
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
      return '';
    }
    
    // Otherwise, remove the listener to allow bfcache
    window.removeEventListener('beforeunload', beforeUnloadListener);
    return null;
  };
  
  // Only add beforeunload for forms or pages with editable content
  // window.addEventListener('beforeunload', beforeUnloadListener);
  
  // 3. Avoid using localStorage in page unload/visibility change events
  // This is a common blocker for bfcache
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
  // Refresh any time-sensitive data
  // For example:
  
  // 1. Re-fetch API data that might be stale
  // 2. Update timers or countdowns
  // 3. Re-establish WebSocket connections
  // 4. Clear any sensitive form data
  
  // This should be customized based on your app's needs
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