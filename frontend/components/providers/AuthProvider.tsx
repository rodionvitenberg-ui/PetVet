'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  // Делаем поля опциональными, чтобы TS не ругался, если бэкенд их не прислал
  avatar?: string;
  first_name?: string;
  last_name?: string;
  is_veterinarian?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuth: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuth: false,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { console.error(e); }
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const checkAuth = async () => {
    try {
      // Запрашиваем данные
      const res = await fetch('/api/auth/me'); 
      
      if (res.ok) {
        const userData = await res.json();
        console.log("[AuthProvider] Успех! Данные:", userData); // <--- ЛОГ УСПЕХА
        setUser(userData);
      } else {
        // Читаем текст ошибки, чтобы понять причину
        const errorText = await res.text();
        console.error(`[AuthProvider] Ошибка запроса (Status: ${res.status}):`, errorText); // <--- ЛОГ ОШИБКИ

        // Если 401 (Токен протух) — выходим
        if (res.status === 401) {
             await fetch('/api/auth/logout', { method: 'POST' });
             setUser(null);
        }
        // Если 500 (Ошибка сервера) — НЕ разлогиниваем сразу, но юзера нет
        // Это позволит увидеть ошибку в консоли, а не просто вылететь
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthProvider] Ошибка сети:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuth: !!user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);