import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, actualTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="ss-theme-toggle"
      title={actualTheme === 'dark' ? 'تبديل للوضع الفاتح' : 'تبديل للوضع الداكن'}
      aria-label="تبديل الوضع"
    >
      <span className="ss-theme-toggle-icon">
        {actualTheme === 'dark' ? '☀️' : '🌙'}
      </span>

      <style>{`
        .ss-theme-toggle {
          position: relative;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: var(--bg-input);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }

        .ss-theme-toggle:hover {
          background: var(--bg-hover);
          border-color: var(--border-strong);
          transform: scale(1.05);
        }

        .ss-theme-toggle:active {
          transform: scale(0.95);
        }

        .ss-theme-toggle-icon {
          display: block;
          animation: ssThemeSpin 0.5s ease;
        }

        @keyframes ssThemeSpin {
          from {
            transform: rotate(-180deg) scale(0.5);
            opacity: 0;
          }
          to {
            transform: rotate(0deg) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </button>
  );
}