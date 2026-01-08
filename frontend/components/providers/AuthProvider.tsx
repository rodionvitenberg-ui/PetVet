'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { console.error(e); }
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const checkAuth = async () => {
    console.log("[AuthProvider] Начало проверки...");
    // Тайм-аут контроллер: если запрос висит больше 3 секунд -> отмена
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch('/api/auth/me', { signal: controller.signal });
      clearTimeout(timeoutId); // Очищаем таймер при успехе

      console.log(`[AuthProvider] Ответ сервера: ${res.status}`);

      if (res.ok) {
        // Убедимся, что это JSON, а не HTML (ошибка middleware)
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const userData = await res.json();
            setUser(userData);
        } else {
            console.error("[AuthProvider] Получен HTML вместо JSON. Скорее всего, редирект Middleware.");
            setUser(null);
        }
      } else {
        // Если 401 — чистим куки, чтобы не было петель
        if (res.status === 401) {
             await fetch('/api/auth/logout', { method: 'POST' });
        }
        setUser(null);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
          console.error('[AuthProvider] Проверка авторизации заняла слишком много времени (Timeout).');
      } else {
          console.error('[AuthProvider] Ошибка сети:', error);
      }
      setUser(null);
    } finally {
      // Это сработает В ЛЮБОМ СЛУЧАЕ и уберет "вечную загрузку"
      console.log("[AuthProvider] Загрузка завершена.");
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