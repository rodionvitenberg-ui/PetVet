// app/login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Ошибка', 'Введите логин и пароль');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Стучимся в Django за токеном
      // Убедись, что на бэке endpoint именно такой. Обычно в SimpleJWT это /api/token/
      const response = await apiClient.post('/api/token/', {
        username,
        password,
      });

      // 2. Если ок — сохраняем токен через наш контекст
      const { access } = response.data;
      await login(access);

      // 3. Перекидываем на главную
      router.replace('/(tabs)'); 
      
    } catch (error: any) {
      console.error(error);
      Alert.alert('Ошибка входа', 'Неверный логин или пароль');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-white">
      <View className="mb-10">
        <Text className="text-3xl font-bold text-blue-600 mb-2">PetVet 🐾</Text>
        <Text className="text-gray-500 text-lg">Добро пожаловать обратно!</Text>
      </View>

      <View className="space-y-4">
        <View>
          <Text className="text-gray-700 mb-1 font-medium">Логин / Email</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            placeholder="vet_user"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View>
          <Text className="text-gray-700 mb-1 font-medium">Пароль</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          onPress={handleLogin}
          disabled={isSubmitting}
          className={`w-full py-4 rounded-xl mt-4 items-center ${
            isSubmitting ? 'bg-blue-400' : 'bg-blue-600'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Войти</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}