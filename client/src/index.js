import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Remove loading screen when React mounts
const rootElement = document.getElementById('root');
if (rootElement) {
  // Clear any loading content
  rootElement.innerHTML = '';
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);