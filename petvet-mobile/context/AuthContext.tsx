// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';
import { petsApi } from '../api/pets';
import { PetRepository } from '../services/PetRepository';

interface AuthProps {
  userToken: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  syncData: () => Promise<void>; // Экспортируем syncData, если захотим вызвать её вручную (например, по pull-to-refresh)
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
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  // === ГЛАВНАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ ===
  const syncData = async () => {
    console.log('🔄 Запуск полной синхронизации (Full Sync)...');
    
    try {
      // --- ЭТАП 1: SYNC UP (Отправляем локальных на сервер) ---
      // Получаем всех питомцев, у которых нет server_id
      const unsyncedPets = await PetRepository.getUnsyncedPets();
      
      if (unsyncedPets.length > 0) {
        console.log(`📤 Найдено ${unsyncedPets.length} локальных питомцев. Начинаем отправку...`);
        
        for (const localPet of unsyncedPets) {
          try {
            // Отправляем запрос на создание
            // Важно: маппим 'species' из SQLite в 'category' для API, если нужно
            const createdPet = await petsApi.createPet({
              name: localPet.name,
              gender: localPet.gender,
              birth_date: localPet.birth_date,
              category: localPet.species || 'cat', 
            });

            // Если сервер ответил успешно — обновляем локальную запись
            // Присваиваем ей ID, который выдал сервер
            await PetRepository.markAsSynced(localPet.local_id, createdPet.id);
            console.log(`✅ Питомец "${localPet.name}" успешно синхронизирован (Server ID: ${createdPet.id})`);
            
          } catch (err) {
            console.error(`❌ Ошибка при отправке питомца "${localPet.name}":`, err);
            // Мы не прерываем цикл, пробуем отправить следующего
          }
        }
      } else {
        console.log('✓ Нет данных для отправки на сервер.');
      }

      // --- ЭТАП 2: SYNC DOWN (Качаем всех с сервера) ---
      // Это нужно, чтобы получить питомцев, созданных на сайте, 
      // или обновить данные уже существующих
      console.log('📥 Скачиваем актуальные данные с сервера...');
      const serverPets = await petsApi.getMyPets();
      
      // Сохраняем/Обновляем их в локальной SQLite
      await PetRepository.syncServerPets(serverPets);
      
      console.log('🏁 Синхронизация успешно завершена!');
      
    } catch (error) {
      console.error('⚠️ Ошибка глобальной синхронизации (возможно, нет интернета):', error);
    }
  };

  const login = async (token: string) => {
    await SecureStore.setItemAsync('access_token', token);
    setUserToken(token);
    
    // Запускаем синхронизацию сразу после входа
    // Не используем await, чтобы интерфейс не завис на экране логина
    syncData();
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    setUserToken(null);
    // Опционально: Можно очистить базу при выходе, 
    // но обычно лучше оставить данные (Local-First подход)
  };

  return (
    <AuthContext.Provider value={{ userToken, isLoading, login, logout, syncData }}>
      {children}
    </AuthContext.Provider>
  );
};