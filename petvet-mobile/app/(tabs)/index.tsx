import { View, Text, Button } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { logout } = useAuth();
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-gray-900">Мои Питомцы 🐕🐈</Text>
      <Button title="Выйти" onPress={logout} />
    </View>
  );
}