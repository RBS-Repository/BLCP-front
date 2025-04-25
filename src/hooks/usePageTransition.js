import { useState, useEffect } from 'react';

/**
 * Custom hook to manage site initial loading and page transitions
 * 
 * @returns {Object} Loading states and functions
 */
const usePageTransition = () => {
  // State for initial site loading (only shows on first visit)
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // State for page transitions (shows on route changes)
  const [isPageLoading, setIsPageLoading] = useState(false);
  
  // Handle initial site load
  useEffect(() => {
    // Check if it's the first visit to the site in this session
    const hasVisitedBefore = sessionStorage.getItem('has_visited');
    
    // Add event listener for when the window loads
    const handleLoad = () => {
      // If this is not the first visit, don't show the initial loader
      if (hasVisitedBefore) {
        setIsInitialLoading(false);
        return;
      }
      
      // Set a small timeout to ensure smooth animation
      setTimeout(() => {
        setIsInitialLoading(false);
        // Mark that user has visited in this session
        sessionStorage.setItem('has_visited', 'true');
      }, 1500); // 1.5 seconds for loader visibility
    };

    // Check if page is already loaded
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    // Set a maximum loading time (in case load event never fires)
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
      // Mark that user has visited in this session
      if (!hasVisitedBefore) {
        sessionStorage.setItem('has_visited', 'true');
      }
    }, 4000); // 4 seconds maximum loading time

    return () => {
      window.removeEventListener('load', handleLoad);
      clearTimeout(timer);
    };
  }, []);
  
  // Function to trigger page loading state
  const startPageLoading = () => {
    setIsPageLoading(true);
  };
  
  // Function to end page loading state
  const endPageLoading = () => {
    setIsPageLoading(false);
  };
  
  return {
    isInitialLoading,   // For initial site loader (SiteLoader)
    isPageLoading,      // For page transition indicator
    startPageLoading,   // Trigger page loading
    endPageLoading      // End page loading
  };
};

export default usePageTransition; 