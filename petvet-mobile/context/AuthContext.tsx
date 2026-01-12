// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client'; // Проверь путь до своего api/client

interface AuthProps {
  userToken: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthProps>({} as AuthProps);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // При запуске проверяем, есть ли токен в памяти телефона
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          setUserToken(token);
          // Тут можно сразу запросить профиль юзера, чтобы убедиться, что токен живой
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const login = async (token: string) => {
    await SecureStore.setItemAsync('access_token', token);
    setUserToken(token);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    setUserToken(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};