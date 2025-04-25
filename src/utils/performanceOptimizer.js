/**
 * Performance optimization utilities for DOM size and main thread
 * Helps with reducing DOM nodes and breaking up long tasks
 */

/**
 * Checks if the Runtime is browser (not SSR)
 * @returns {boolean} True if running in browser
 */
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Breaks up a long task into smaller chunks to prevent blocking the main thread
 * @param {Array} items - Items to process
 * @param {Function} processItem - Function to process each item
 * @param {Object} options - Configuration options
 * @param {number} options.chunkSize - Items to process per chunk (default: 10)
 * @param {number} options.delay - Delay between chunks in ms (default: 10)
 * @returns {Promise} Promise that resolves when all items are processed
 */
export const processInChunks = (items, processItem, options = {}) => {
  const { chunkSize = 10, delay = 10 } = options;
  let index = 0;
  
  return new Promise((resolve) => {
    function processChunk() {
      const startTime = performance.now();
      
      // Process items until chunk size is reached or we're out of time (50ms max)
      while (index < items.length && performance.now() - startTime < 50 && (index % chunkSize !== 0 || index === 0)) {
        processItem(items[index], index);
        index++;
      }
      
      // If we have more items, schedule next chunk with requestIdleCallback or setTimeout
      if (index < items.length) {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => setTimeout(processChunk, delay));
        } else {
          setTimeout(processChunk, delay);
        }
      } else {
        // All items processed
        resolve();
      }
    }
    
    processChunk();
  });
};

/**
 * Optimizes rendering of large lists using virtualization technique
 * This avoids rendering all items at once, reducing DOM size
 * @param {Array} items - All items in the list
 * @param {Function} renderItem - Function to render a single item
 * @param {Object} options - Configuration options
 * @param {number} options.itemHeight - Height of each item in pixels
 * @param {number} options.overscan - Number of items to render outside of viewport
 * @param {number} options.visibleHeight - Height of visible container
 * @returns {Object} - Virtualized list data and methods
 */
export const useVirtualList = (items, renderItem, options = {}) => {
  if (!isBrowser) {
    return {
      virtualItems: [],
      totalHeight: 0,
      startIndex: 0,
      endIndex: 0,
    };
  }
  
  const { itemHeight = 30, overscan = 3, visibleHeight = window.innerHeight } = options;
  
  // Calculate visible items
  const visibleItemCount = Math.ceil(visibleHeight / itemHeight);
  const totalItems = items.length;
  
  // Get current scroll position
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  
  // Calculate start and end indices
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleItemCount + overscan * 2);
  
  // Create virtual items
  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      item: items[i],
      offsetTop: i * itemHeight,
      height: itemHeight,
    });
  }
  
  return {
    virtualItems,
    totalHeight: totalItems * itemHeight,
    startIndex,
    endIndex,
  };
};

/**
 * Optimizes DOM updates by batching them
 * @param {Function} updateFn - Function with DOM updates to batch
 */
export const batchDomUpdates = (updateFn) => {
  if (!isBrowser) return;
  
  if ('requestAnimationFrame' in window) {
    window.requestAnimationFrame(() => {
      updateFn();
    });
  } else {
    updateFn();
  }
};

/**
 * Schedules non-critical task to run when browser is idle
 * @param {Function} task - Function to run when idle
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Maximum time to wait (default: 2000ms)
 */
export const runWhenIdle = (task, options = {}) => {
  if (!isBrowser) return;
  
  const { timeout = 2000 } = options;
  
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout });
  } else {
    setTimeout(task, 1);
  }
};

/**
 * Monitors a component for excessive re-renders
 * @param {string} componentName - Name of the component to monitor
 * @param {number} threshold - Number of renders to consider excessive
 */
export const monitorRenders = (componentName, threshold = 5) => {
  if (!isBrowser || !__DEV__) return;
  
  const renderCounts = {};
  
  return () => {
    renderCounts[componentName] = (renderCounts[componentName] || 0) + 1;
    
    if (renderCounts[componentName] > threshold) {
      console.warn(`Component ${componentName} has rendered ${renderCounts[componentName]} times. This may indicate a performance issue.`);
    }
  };
};

/**
 * Measure DOM size and warn if it exceeds thresholds
 */
export const measureDomSize = () => {
  if (!isBrowser || !__DEV__) return;
  
  runWhenIdle(() => {
    const domSize = document.querySelectorAll('*').length;
    const maxRecommendedSize = 1500;
    
    if (domSize > maxRecommendedSize) {
      console.warn(`DOM size (${domSize} elements) exceeds recommended maximum of ${maxRecommendedSize}. Consider virtualizing lists or reducing component nesting.`);
    }
  });
};

export default {
  processInChunks,
  useVirtualList,
  batchDomUpdates,
  runWhenIdle,
  monitorRenders,
  measureDomSize
}; 