import { useState, useEffect } from 'react';

// Theme utility — manages dark/light toggle
const STORAGE_KEY = 'acdsf-theme';

export type Theme = 'dark' | 'light';

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark';
}

export function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent('acdsf-theme-change', { detail: { theme } }));
}

export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function initTheme() {
  applyTheme(getStoredTheme());
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<{ theme: Theme }>;
      if (custom.detail?.theme) {
        setTheme(custom.detail.theme);
      } else {
        setTheme(getStoredTheme());
      }
    };
    window.addEventListener('acdsf-theme-change', handleSync);
    return () => window.removeEventListener('acdsf-theme-change', handleSync);
  }, []);

  return {
    theme,
    isLight: theme === 'light',
    toggle: toggleTheme,
  };
}
