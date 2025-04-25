import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'

// Remove unnecessary polyfills for modern browsers
// These are only loaded conditionally if needed
const loadPolyfills = async () => {
  if (!window.Promise || !window.fetch || !window.Object.assign) {
    console.log('Loading polyfills for older browsers...');
    await import('core-js/stable');
    await import('regenerator-runtime/runtime');
    await import('whatwg-fetch');
  }
};

// Initialize the app after polyfills (if needed)
const initApp = () => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>,
  )
};

// Load polyfills only if needed, then initialize
loadPolyfills().then(initApp);
