'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  first_name?: string;
  last_name?: string;
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

  // Функция выхода (Очистка кук)
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me'); 
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        // === ВОТ ЗДЕСЬ БЫЛА ПРОБЛЕМА ===
        // Если сервер ответил ошибкой (401), значит кука "тухлая".
        // Мы ОБЯЗАНЫ её удалить, иначе Middleware будет вечно перекидывать нас.
        if (res.status === 401) {
            await fetch('/api/auth/logout', { method: 'POST' });
        }
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed', error);
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