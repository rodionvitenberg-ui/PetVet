// app/(tabs)/index.tsx
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PetRepository, LocalPet } from '../../services/PetRepository';

export default function Dashboard() {
  const router = useRouter();
  const [pets, setPets] = useState<LocalPet[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPets = async () => {
    const data = await PetRepository.getAllPets();
    setPets(data);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPets();
    }, [])
  );

  // Для pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPets();
    setRefreshing(false);
  };

  const renderPetItem = ({ item }: { item: LocalPet }) => (
    <TouchableOpacity 
      className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 flex-row items-center"
      onPress={() => console.log('Открыть детали:', item.local_id)}
    >
      {/* Аватарка (заглушка) */}
      <View className={`w-14 h-14 rounded-full items-center justify-center mr-4 ${item.species === 'dog' ? 'bg-blue-100' : 'bg-orange-100'}`}>
        <Text className="text-2xl">{item.species === 'dog' ? '🐶' : '🐱'}</Text>
      </View>
      
      <View className="flex-1">
        <View className="flex-row justify-between items-center">
          <Text className="text-lg font-bold text-gray-900">{item.name}</Text>
          {/* Статус синхронизации (виден только для отладки, потом скроем) */}
          {!item.server_id && (
            <View className="bg-yellow-100 px-2 py-0.5 rounded">
              <Text className="text-[10px] text-yellow-800 font-bold">LOCAL</Text>
            </View>
          )}
        </View>
        <Text className="text-gray-500">
          {item.gender === 'M' ? 'Мальчик' : 'Девочка'} • {item.breed || 'Без породы'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Заголовок */}
      <View className="px-5 pt-12 pb-4 bg-white">
        <Text className="text-3xl font-bold text-gray-900">Мои питомцы</Text>
      </View>

      <FlatList
        data={pets}
        keyExtractor={(item) => item.local_id.toString()}
        renderItem={renderPetItem}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View className="items-center justify-center mt-20">
            <Text className="text-4xl mb-4">🐾</Text>
            <Text className="text-gray-500 text-center">У вас пока нет питомцев.{'\n'}Добавьте первого!</Text>
          </View>
        }
      />

      {/* FAB (Плавающая кнопка) */}
      <TouchableOpacity
        onPress={() => router.push('/pets/create')}
        className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full items-center justify-center shadow-lg shadow-blue-300"
      >
        <Text className="text-white text-3xl font-light pb-1">+</Text>
      </TouchableOpacity>
    </View>
  );
}