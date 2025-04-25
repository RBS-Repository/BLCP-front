import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
// Import scheduler directly to ensure it loads before React uses it
import 'scheduler'

// Set React Router future flags to silence warnings
if (typeof window !== 'undefined') {
  window.__reactRouterFutureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  };
}

// Remove unnecessary polyfills for modern browsers
// These are only loaded conditionally if needed
const loadPolyfills = async () => {
  if (!window.Promise || !window.fetch || !window.Object.assign) {
    await import('core-js/stable');
    await import('regenerator-runtime/runtime');
    await import('whatwg-fetch');
  }
};

// Initialize the app after polyfills (if needed)
const initApp = () => {
  // Create a simple wrapper to ensure correct React initialization
  const rootElement = document.getElementById('root');
  
  // Additional safety - ensure root element exists
  if (!rootElement) {
    console.error('Root element not found, cannot mount React app');
    return;
  }
  
  try {
    // Create the React root using the stable API
    const root = ReactDOM.createRoot(rootElement);
    
    // Properly render with error boundaries
    root.render(
      import.meta.env.PROD ? (
        <AuthProvider>
          <App />
        </AuthProvider>
      ) : (
        <React.StrictMode>
          <AuthProvider>
            <App />
          </AuthProvider>
        </React.StrictMode>
      )
    );
  } catch (err) {
    console.error('Error initializing React:', err);
  }
};

// Load polyfills only if needed, then initialize
loadPolyfills().then(initApp).catch(err => {
  console.error('Error in application initialization:', err);
});
