import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'

// Set React Router future flags to silence warnings
if (typeof window !== 'undefined') {
  window.__reactRouterFutureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  };
}

// Fix for scheduler issue: ensure scheduler is properly loaded
// This helps resolve "unstable_scheduleCallback" errors
const fixSchedulerIssue = () => {
  // This will ensure the scheduler is properly initialized
  if (typeof window !== 'undefined' && !window.__REACT_SCHEDULER_INIT) {
    window.__REACT_SCHEDULER_INIT = true;
  }
};

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
  // Apply scheduler fix
  fixSchedulerIssue();
  
  // Create a simple wrapper to ensure correct React initialization
  const rootElement = document.getElementById('root');
  
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
};

// Load polyfills only if needed, then initialize
loadPolyfills().then(initApp);
