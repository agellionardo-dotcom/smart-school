import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const THEMES = {
  dark: 'dark',
  light: 'light',
  auto: 'auto',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const [actualTheme, setActualTheme] = useState('dark');

  // ✅ تحديد الوضع الفعلي
  useEffect(() => {
    let effectiveTheme = theme;

    if (theme === 'auto') {
      const hour = new Date().getHours();
      effectiveTheme = hour >= 6 && hour < 18 ? 'light' : 'dark';
    }

    setActualTheme(effectiveTheme);
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // ✅ متابعة Auto mode
  useEffect(() => {
    if (theme !== 'auto') return;

    const interval = setInterval(() => {
      const hour = new Date().getHours();
      const newTheme = hour >= 6 && hour < 18 ? 'light' : 'dark';
      if (newTheme !== actualTheme) {
        setActualTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      }
    }, 60000); // كل دقيقة

    return () => clearInterval(interval);
  }, [theme, actualTheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}