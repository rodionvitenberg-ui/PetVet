'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthProvider'; 

type AppMode = 'owner' | 'vet';

interface AppModeContextType {
  mode: AppMode;
  toggleMode: () => void;
  isVetMode: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Инициализируем стейт сразу, пытаясь прочитать из localStorage (только на клиенте)
  const [mode, setMode] = useState<AppMode>('owner');

  // 1. ЕДИНСТВЕННЫЙ ИСТОЧНИК ПРАВДЫ ДЛЯ DOM
  // Как только меняется переменная mode, мы обновляем класс и localStorage.
  // Это гарантирует, что стейт и внешний вид всегда синхронны.
useEffect(() => {
    // Проверка 1: Мы точно в браузере?
    if (typeof window !== 'undefined') {
        const body = document.body;
        
        // Проверка 2: А body вообще существует? (Вот тут у тебя падало)
        if (!body) return;

        if (mode === 'vet') {
            body.classList.add('theme-vet');
        } else {
            body.classList.remove('theme-vet');
        }
        
        localStorage.setItem('app_mode', mode);
    }
  }, [mode]);

  // 2. Логика переключения
  const toggleMode = () => {
    setMode((prev) => (prev === 'owner' ? 'vet' : 'owner'));
  };

  // 3. Авто-определение при загрузке / входе
  useEffect(() => {
    // Если пользователь загрузился и он ветеринар — форсируем режим
    if (user) {
        if (user.is_veterinarian) {
            setMode('vet');
        } else {
            // Если обычный юзер, можно оставить текущий выбор или сбросить на 'owner'
            // Обычно лучше оставить 'owner'
            setMode('owner');
        }
    } else {
        // Если гость — восстанавливаем из localStorage
        const savedMode = localStorage.getItem('app_mode') as AppMode;
        if (savedMode) {
            setMode(savedMode);
        }
    }
  }, [user]);

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