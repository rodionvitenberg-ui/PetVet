'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type AppMode = 'owner' | 'vet';

interface AppModeContextType {
  mode: AppMode;
  toggleMode: () => void;
  isVetMode: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>('owner');

  useEffect(() => {
    // 1. При загрузке читаем из localStorage
    const savedMode = localStorage.getItem('app_mode') as AppMode;
    if (savedMode) {
      setMode(savedMode);
      if (savedMode === 'vet') document.body.classList.add('theme-vet');
    }
  }, []);

  const toggleMode = () => {
    const newMode = mode === 'owner' ? 'vet' : 'owner';
    setMode(newMode);
    localStorage.setItem('app_mode', newMode);

    // 2. Управляем CSS-классом для глобальной темы
    if (newMode === 'vet') {
      document.body.classList.add('theme-vet');
    } else {
      document.body.classList.remove('theme-vet');
    }
  };

  return (
    <AppModeContext.Provider value={{ mode, toggleMode, isVetMode: mode === 'vet' }}>
      {children}
    </AppModeContext.Provider>
  );
}

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) throw new Error('useAppMode must be used within AppModeProvider');
  return context;
};