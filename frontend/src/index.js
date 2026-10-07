import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// ============================================================
// Service Worker Registration
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[SW] Registered:', registration.scope);
      })
      .catch((error) => {
        console.warn('[SW] Registration failed:', error);
      });
  });
}

// ============================================================
// إضافة manifest.json ديناميكياً (لو مش موجود في index.html)
// ============================================================
if (!document.querySelector('link[rel="manifest"]')) {
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest.json';
  document.head.appendChild(link);
}