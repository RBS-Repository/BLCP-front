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
  // Disable StrictMode in production to avoid double-mounting components
  const AppRoot = import.meta.env.PROD 
    ? (
      <AuthProvider>
        <App />
      </AuthProvider>
    )
    : (
      <React.StrictMode>
        <AuthProvider>
          <App />
        </AuthProvider>
      </React.StrictMode>
    );
  
  ReactDOM.createRoot(document.getElementById('root')).render(AppRoot);
};

// Load polyfills only if needed, then initialize
loadPolyfills().then(initApp);
