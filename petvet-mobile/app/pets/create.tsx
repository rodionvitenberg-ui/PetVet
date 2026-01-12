// app/pets/create.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { PetRepository } from '../../services/PetRepository';

export default function CreatePetScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'cat' | 'dog' | 'other'>('cat');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите имя питомца');
      return;
    }

    setIsSubmitting(true);
    try {
      // Сохраняем ТОЛЬКО в локальную базу SQLite
      // Синхронизация произойдет фоном, если юзер залогинен (реализуем позже)
      await PetRepository.createPet({
        name,
        species,
        gender,
        birth_date: new Date().toISOString().split('T')[0] // Пока текущая дата как заглушка
      });

      router.back(); // Возвращаемся назад
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить питомца');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="p-6">
        <Text className="text-3xl font-bold text-gray-900 mb-6">Новый питомец</Text>

        {/* --- ИМЯ --- */}
        <View className="mb-6">
          <Text className="text-gray-500 mb-2 font-medium">Как зовут?</Text>
          <TextInput
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-lg text-gray-900"
            placeholder="Например: Барсик"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* --- КТО ЭТО? (Вид) --- */}
        <View className="mb-6">
          <Text className="text-gray-500 mb-2 font-medium">Кто это?</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => setSpecies('cat')}
              className={`flex-1 py-4 rounded-xl items-center border-2 ${species === 'cat' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
            >
              <Text className="text-2xl">🐱</Text>
              <Text className={`font-bold mt-1 ${species === 'cat' ? 'text-blue-600' : 'text-gray-500'}`}>Кошка</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setSpecies('dog')}
              className={`flex-1 py-4 rounded-xl items-center border-2 ${species === 'dog' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}
            >
              <Text className="text-2xl">🐶</Text>
              <Text className={`font-bold mt-1 ${species === 'dog' ? 'text-blue-600' : 'text-gray-500'}`}>Собака</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- ПОЛ --- */}
        <View className="mb-8">
          <Text className="text-gray-500 mb-2 font-medium">Пол</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity 
              onPress={() => setGender('M')}
              className={`flex-1 py-3 rounded-xl items-center border ${gender === 'M' ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
            >
              <Text className={`font-bold text-lg ${gender === 'M' ? 'text-white' : 'text-gray-600'}`}>Мальчик</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setGender('F')}
              className={`flex-1 py-3 rounded-xl items-center border ${gender === 'F' ? 'bg-pink-500 border-pink-500' : 'bg-white border-gray-200'}`}
            >
              <Text className={`font-bold text-lg ${gender === 'F' ? 'text-white' : 'text-gray-600'}`}>Девочка</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- КНОПКА СОХРАНИТЬ --- */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          className={`w-full py-4 rounded-2xl items-center ${isSubmitting ? 'bg-gray-300' : 'bg-gray-900'}`}
        >
          <Text className="text-white font-bold text-lg">
            {isSubmitting ? 'Сохраняем...' : 'Создать карточку'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}