import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component to track route changes
 * Loading indicator functionality has been removed
 * Must be used inside a Router
 */
const RouteChangeTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Add any route change tracking logic here if needed
    // For example, analytics tracking
  }, [location]);

  // This component doesn't render anything
  return null;
};

export default RouteChangeTracker; 