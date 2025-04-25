import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component to track route changes and trigger loading indicators
 * Must be used inside a Router
 */
const RouteChangeTracker = ({ onRouteChange }) => {
  const location = useLocation();

  useEffect(() => {
    // Trigger the callback when route changes
    if (onRouteChange) {
      onRouteChange(location);
    }
  }, [location, onRouteChange]);

  // This component doesn't render anything
  return null;
};

export default RouteChangeTracker; 