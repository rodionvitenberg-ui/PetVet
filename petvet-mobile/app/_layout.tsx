// app/_layout.tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { initDatabase } from '../database/init';
import "../global.css";

const InitialLayout = () => {
  const { userToken, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login';

    // ЛОГИКА ИЗМЕНЕНА:
    // Мы больше НЕ выкидываем на логин, если токена нет.
    // Пускаем всех (Slot отрендерит то, что запросили).
    
    // Единственное правило: если юзер УЖЕ залогинен, нечего ему делать на экране входа
    if (userToken && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [userToken, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return <Slot />;
};

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}