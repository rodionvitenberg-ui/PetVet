'use client';

import { useEffect, useState } from 'react';

// ponytail: generic persisted useState. No lib — localStorage is enough.
export function usePersistedState<T>(key: string, initial: T, delay = 300) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // storage full / private mode — ignore
      }
    }, delay);
    return () => clearTimeout(t);
  }, [key, state, delay]);

  return [state, setState] as const;
}
