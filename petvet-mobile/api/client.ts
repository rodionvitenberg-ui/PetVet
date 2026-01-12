import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Expo автоматически подставляет значение из .env во время сборки
// Если переменная не найдена (забыли создать .env), используем localhost как заглушку
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

console.log('🔗 Connecting to API at:', BASE_URL); // Полезно для отладки

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ... дальше идут твои интерцепторы (interceptors) без изменений ...
apiClient.interceptors.request.use(async (config) => {
    // ... твой код с токеном ...
    try {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Ошибка получения токена', error);
      }
      return config;
});

// ... обработка ошибок тоже остается ...
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        // ... твой код ретрая ...
        return Promise.reject(error);
    }
);