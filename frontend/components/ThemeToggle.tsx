'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const getTheme = () => document.documentElement.dataset.theme === 'dark';

// ponytail: module-level subscribe (no store lib); split into a real store if more consumers appear
const themeStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    themeStore.listeners.add(listener);
    return () => themeStore.listeners.delete(listener);
  },
  getSnapshot: () => getTheme(),
  // Server snapshot: no document on SSR; default to light so markup doesn't mismatch
  getServerSnapshot: () => false as const,
};

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );

  const toggle = () => {
    const next = !isDark;
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    localStorage.setItem('theme', next ? 'dark' : 'light');
    themeStore.listeners.forEach((l) => l());
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-full transition text-muted-foreground hover:text-primary hover:bg-muted cursor-pointer focus-ring"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
