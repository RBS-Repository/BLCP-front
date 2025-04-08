import React from 'react';
import ReactDOM from 'react-dom/client';

// Minimal test component
const App = () => <div>Hello World</div>;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 