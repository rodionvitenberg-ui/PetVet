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
  is_veterinarian?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuth: boolean;
  logout: () => void;
  loginSuccess: (userData: User, accessToken: string, refreshToken: string) => void;
  updateUser: (userData: User) => void; // <-- Новая функция
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuth: false,
  logout: () => {},
  loginSuccess: () => {},
  updateUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  // Используем ТОЛЬКО при входе (с редиректом)
  const loginSuccess = (userData: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setUser(userData);
    router.push('/'); 
    router.refresh();
  };

  // Используем при обновлении профиля (БЕЗ редиректа)
  const updateUser = (userData: User) => {
    setUser(userData);
    router.refresh(); // Обновляем серверные компоненты (например, аватарку в шапке)
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/api/auth/me/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        if (res.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }
        setUser(null);
      }
    } catch (error) {
      console.error('[AuthProvider] Network error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuth: !!user, isLoading, logout, loginSuccess, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);