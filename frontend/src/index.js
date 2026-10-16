import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/theme.css';
import './styles/animations.css';
import './styles/glass.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ============================================
// ✅ PWA — Service Worker Registration
// ============================================
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[PWA] ✅ Service Worker registered:', registration.scope);

        // ✅ تحديث تلقائي لما يتوفر إصدار جديد
        registration.onupdatefound = () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.onstatechange = () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('[PWA] 🔄 New version available');
              // (اختياري) ممكن نظهر toast للمستخدم
            }
          };
        };
      })
      .catch((err) => {
        console.warn('[PWA] ❌ Service Worker registration failed:', err);
      });
  });
}