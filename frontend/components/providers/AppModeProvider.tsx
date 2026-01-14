'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from './AuthProvider'; 

interface AppModeContextType {
  isVetMode: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  const isVetMode = !!(user && user.is_veterinarian);

  // Эффект для обновления класса на body (чтобы менять цвета глобально)
  useEffect(() => {
    if (typeof window !== 'undefined' && document.body) {
        if (isVetMode) {
            document.body.classList.add('theme-vet');
        } else {
            document.body.classList.remove('theme-vet');
        }
    }
  }, [isVetMode]);

  return (
    <AppModeContext.Provider value={{ isVetMode }}>
      {children}
    </AppModeContext.Provider>
  );
}

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) throw new Error('useAppMode must be used within AppModeProvider');
  return context;
};