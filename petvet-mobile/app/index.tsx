// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Просто перенаправляем пользователя на главную вкладку
  return <Redirect href="/(tabs)" />;
}