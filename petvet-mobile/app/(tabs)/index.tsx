// app/(tabs)/index.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // Встроенные иконки
import { useAuth } from '../../context/AuthContext';
import { PetRepository, LocalPet } from '../../services/PetRepository';

export default function Dashboard() {
  const router = useRouter();
  const { userToken } = useAuth();
  const [pets, setPets] = useState<LocalPet[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Загрузка данных
  const loadData = async () => {
    const data = await PetRepository.getAllPets();
    setPets(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    // Тут можно вызвать syncData() из контекста, если нужно
    setRefreshing(false);
  };

  // --- КОМПОНЕНТЫ UI ---

  const QuickAction = ({ icon, label, color, onPress }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-white p-4 rounded-2xl items-center justify-center border border-gray-100 shadow-sm w-[48%] mb-4"
    >
      <View className={`w-12 h-12 rounded-full items-center justify-center mb-2 ${color}`}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text className="font-semibold text-gray-700">{label}</Text>
    </TouchableOpacity>
  );

  const PetCardSmall = ({ item }: { item: LocalPet }) => (
    <TouchableOpacity 
      onPress={() => console.log('Open Pet', item.local_id)}
      className="mr-4 items-center"
    >
      <View className={`w-20 h-20 rounded-full items-center justify-center border-2 ${item.server_id ? 'border-green-400' : 'border-gray-200'} bg-gray-100 overflow-hidden`}>
        {/* Заглушка, пока нет реальных фото */}
        <Text className="text-3xl">{item.species === 'dog' ? '🐶' : '🐱'}</Text>
      </View>
      <Text className="mt-2 font-medium text-gray-900 text-center w-24" numberOfLines={1}>
        {item.name}
      </Text>
      {!item.server_id && (
        <Text className="text-[10px] text-gray-400">Локально</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 1. HEADER */}
      <View className="pt-14 pb-6 px-6 bg-white rounded-b-3xl shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-gray-400 text-sm font-medium">
              {userToken ? 'С возвращением,' : 'Добро пожаловать,'}
            </Text>
            <Text className="text-3xl font-bold text-gray-900">
              {userToken ? 'Владелец' : 'Гость'} 👋
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push(userToken ? '/(tabs)/profile' : '/login')} // Предполагаем, что профиль будет во вкладках, или просто '/login'
            className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center"
          >
            <Ionicons name="person" size={24} color="#4B5563" />
          </TouchableOpacity>
        </View>

        {/* Guest Banner (Если не вошел) */}
        {!userToken && (
          <TouchableOpacity 
            onPress={() => router.push('/login')}
            className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex-row items-center mt-2"
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#2563EB" />
            <View className="ml-3 flex-1">
              <Text className="text-blue-700 font-bold">Синхронизация отключена</Text>
              <Text className="text-blue-600 text-xs">Войдите, чтобы не потерять питомцев</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#2563EB" />
          </TouchableOpacity>
        )}
      </View>

      <View className="p-6">
        
        {/* 2. MY PETS (Горизонтальный скролл) */}
        <View className="mb-8">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-xl font-bold text-gray-900">Мои питомцы</Text>
            <Text className="text-blue-600 font-medium">Все ({pets.length})</Text>
          </View>
          
          {pets.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
              {/* Кнопка добавления прямо в ленте */}
              <TouchableOpacity 
                onPress={() => router.push('/pets/create')}
                className="mr-4 items-center justify-center w-20"
              >
                <View className="w-20 h-20 rounded-full bg-blue-50 border-2 border-dashed border-blue-300 items-center justify-center">
                  <Ionicons name="add" size={32} color="#2563EB" />
                </View>
                <Text className="mt-2 font-medium text-blue-600">Добавить</Text>
              </TouchableOpacity>

              {pets.map((pet) => (
                <PetCardSmall key={pet.local_id} item={pet} />
              ))}
            </ScrollView>
          ) : (
            <View className="bg-white p-6 rounded-2xl items-center justify-center border border-gray-100 border-dashed">
              <Text className="text-gray-400 text-center mb-4">Пока никого нет</Text>
              <TouchableOpacity 
                onPress={() => router.push('/pets/create')}
                className="bg-gray-900 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-bold">Добавить первого</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 3. QUICK ACTIONS */}
        <Text className="text-xl font-bold text-gray-900 mb-4">Что делаем?</Text>
        <View className="flex-row flex-wrap justify-between">
          <QuickAction 
            icon="medical" 
            label="Визит к врачу" 
            color="bg-green-500"
            onPress={() => console.log('Health Event')} 
          />
          <QuickAction 
            icon="scan" 
            label="AI Анализ" 
            color="bg-purple-600"
            onPress={() => console.log('Start Camera')} // Сюда потом подключим камеру
          />
          <QuickAction 
            icon="calendar" 
            label="Календарь" 
            color="bg-orange-500"
            onPress={() => console.log('Calendar')} 
          />
          <QuickAction 
            icon="search" 
            label="Найти клинику" 
            color="bg-blue-500"
            onPress={() => console.log('Map')} 
          />
        </View>

      </View>
    </ScrollView>
  );
}