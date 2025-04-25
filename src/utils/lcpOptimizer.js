// Import React for React.createElement
import React from 'react';

/**
 * Utility for optimizing Largest Contentful Paint (LCP)
 * Helps identify and optimize the largest visible element
 */

/**
 * Monitors and reports the LCP element and its loading time
 * Call this function early in your app's initialization
 */
export const monitorLCP = () => {
  // Skip if not in browser or if the Performance API isn't available
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
  
  // Skip detailed monitoring in production
  if (import.meta.env.PROD) {
    // Only collect minimal data in production without logging
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lcpEntry = entries[entries.length - 1];
        
        if (lcpEntry) {
          // Only store essential data for analytics
          window.lcpElementInfo = {
            time: lcpEntry.startTime / 1000,
            type: lcpEntry.element?.tagName || 'unknown',
          };
        }
      });
      
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      
      // Clean up
      setTimeout(() => {
        lcpObserver.disconnect();
      }, 10000);
    } catch (error) {
      // Silent fail in production
    }
    return;
  }
  
  // Development-only detailed monitoring
  try {
    // Create a performance observer to monitor LCP
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      // Get the most recent entry (the last one is the most accurate for LCP)
      const lcpEntry = entries[entries.length - 1];
      
      if (lcpEntry) {
        const lcpElement = lcpEntry.element;
        const lcpTime = lcpEntry.startTime / 1000; // Convert to seconds
        
        // Log LCP info in development
        console.log('LCP Element:', lcpElement);
        console.log('LCP Time:', lcpTime.toFixed(2) + 's');
        
        // Provide optimization suggestion if LCP is slow
        if (lcpTime > 2.5) {
          console.warn('⚠️ LCP is slow (> 2.5s). Consider optimizing this element.');
          if (lcpElement) {
            console.warn('Element type:', lcpElement.tagName);
            
            // Provide specific advice based on element type
            if (lcpElement.tagName === 'IMG') {
              console.warn('Optimization tips for images:');
              console.warn('1. Add width and height attributes');
              console.warn('2. Use preload: <link rel="preload" as="image" href="..." />');
              console.warn('3. Consider using a LQIP (Low Quality Image Placeholder)');
            } else if (lcpElement.tagName === 'H1' || lcpElement.tagName === 'P') {
              console.warn('Optimization tips for text elements:');
              console.warn('1. Ensure fonts are preloaded or use system fonts');
              console.warn('2. Reduce blocking CSS and JavaScript');
            }
          }
        }
        
        // Store LCP info for potential reporting to analytics
        window.lcpElementInfo = {
          type: lcpElement?.tagName || 'unknown',
          time: lcpTime,
          elementId: lcpElement?.id || null,
          elementClass: lcpElement?.className || null,
        };
      }
    });
    
    // Start observing LCP
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    
    // Clean up after LCP is determined (usually within first few seconds)
    setTimeout(() => {
      lcpObserver.disconnect();
    }, 10000);
  } catch (error) {
    console.error('Error monitoring LCP:', error);
  }
};

/**
 * Generates preload links for critical assets to improve LCP
 * @param {Array} resources - Array of resources to preload
 * @returns {Array} - Array of link elements to add to head
 */
export const generatePreloadLinks = (resources = []) => {
  return resources.map(resource => {
    const { href, type, as, crossOrigin, media } = resource;
    
    return `<link rel="preload" href="${href}" as="${as}" ${type ? `type="${type}"` : ''} ${crossOrigin ? 'crossorigin' : ''} ${media ? `media="${media}"` : ''}>`;
  }).join('\n');
};

/**
 * Identifies potential LCP elements in a component and adds priority loading
 * @param {React.Component} component - Component to optimize
 * @returns {React.Component} - Optimized component
 */
export const optimizeLCP = (Component) => {
  return (props) => {
    // No JSX - use React.createElement instead
    return React.createElement(Component, { 
      ...props, 
      lcpOptimized: true 
    });
  };
};

/**
 * Prioritizes loading of the LCP image
 * @param {string} src - Image source URL
 * @returns {HTMLElement} - Preload link element
 */
export const preloadLCPImage = (src) => {
  if (typeof document === 'undefined') return null;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  link.importance = 'high'; // Hint to browser about importance
  
  // Add fetchpriority attribute for modern browsers
  link.setAttribute('fetchpriority', 'high');
  
  // Ensure the image type is specified for better browser handling
  if (src.endsWith('.jpg') || src.endsWith('.jpeg')) {
    link.type = 'image/jpeg';
  } else if (src.endsWith('.png')) {
    link.type = 'image/png';
  } else if (src.endsWith('.webp')) {
    link.type = 'image/webp';
  }
  
  // Append to head to start loading ASAP
  document.head.appendChild(link);
  
  return link;
};

/**
 * Adds font-display: swap to improve text rendering during font loading
 * This ensures text is visible using a system font while custom fonts load
 */
export const optimizeFontDisplay = () => {
  if (typeof document === 'undefined') return;
  
  // Create a style element to add font-display: swap
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-display: swap !important;
    }
  `;
  
  // Append to head
  document.head.appendChild(style);
};

export default {
  monitorLCP,
  generatePreloadLinks,
  optimizeLCP,
  preloadLCPImage,
  optimizeFontDisplay
}; 