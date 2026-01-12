// app/_layout.tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import "../global.css"; // Твои стили

// Отдельный компонент для логики защиты роутов
const InitialLayout = () => {
  const { userToken, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === 'login'; // Мы сейчас на экране логина?

    if (!userToken && !inAuthGroup) {
      // Если нет токена и мы не на логине — гони на логин
      router.replace('/login');
    } else if (userToken && inAuthGroup) {
      // Если есть токен, а мы на логине — гони домой
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

  return <Slot />; // Slot — это место, куда подставляется текущий экран
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}