import "../global.css";
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

// Проверяем, работают ли классы Tailwind
export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-100">
      <Text className="text-3xl font-bold text-blue-600">
        PetVet Mobile 🐾
      </Text>
      <Text className="text-gray-500 mt-2">
        Связь с сервером настраивается...
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}