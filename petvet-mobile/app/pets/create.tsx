// app/pets/create.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMobilePetForm } from '../../hooks/useMobilePetForm';
import { PetCategory, MOCK_TAGS } from '../../constants/dictionaries';

// --- ШАГ 1: БАЗА ---
const Step1Basic = ({ data, dictionaries, onChange }: any) => (
  <View>
    <Text className="text-xl font-bold mb-6 text-gray-800">Кто у нас тут?</Text>

    {/* Категории */}
    <View className="flex-row gap-3 mb-6">
      {dictionaries.categories.map((cat: PetCategory) => (
        <TouchableOpacity 
          key={cat.slug}
          onPress={() => onChange('categorySlug', cat.slug)}
          className={`flex-1 py-4 rounded-2xl items-center border-2 ${data.categorySlug === cat.slug ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white'}`}
        >
          <Text className="text-3xl mb-1">{cat.icon}</Text>
          <Text className={`font-bold ${data.categorySlug === cat.slug ? 'text-blue-600' : 'text-gray-500'}`}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    {/* Имя */}
    <View className="mb-4">
      <Text className="text-gray-500 mb-2 font-medium ml-1">Кличка</Text>
      <TextInput
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-lg text-gray-900"
        placeholder="Барсик"
        value={data.name}
        onChangeText={(val) => onChange('name', val)}
      />
    </View>

    {/* Пол */}
    <View className="mb-4">
      <Text className="text-gray-500 mb-2 font-medium ml-1">Пол</Text>
      <View className="bg-gray-100 p-1 rounded-xl flex-row">
        <TouchableOpacity 
          onPress={() => onChange('gender', 'M')}
          className={`flex-1 py-3 rounded-lg items-center ${data.gender === 'M' ? 'bg-white shadow-sm' : ''}`}
        >
          <Text className={`font-bold ${data.gender === 'M' ? 'text-blue-600' : 'text-gray-400'}`}>Мальчик</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onChange('gender', 'F')}
          className={`flex-1 py-3 rounded-lg items-center ${data.gender === 'F' ? 'bg-white shadow-sm' : ''}`}
        >
          <Text className={`font-bold ${data.gender === 'F' ? 'text-pink-600' : 'text-gray-400'}`}>Девочка</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// --- ШАГ 2: ДЕТАЛИ (Динамический!) ---
// --- ШАГ 2: ДЕТАЛИ (Исправленный) ---
const Step2Details = ({ data, currentCategory, tags, onChange, onToggleTag, onSetAttribute }: any) => (
  <View>
    <Text className="text-xl font-bold mb-6 text-gray-800">Подробности</Text>

    {/* Порода */}
    <View className="mb-6">
      <Text className="text-gray-500 mb-2 font-medium ml-1">Порода</Text>
      <TextInput
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
        placeholder="Если знаете"
        value={data.breed}
        onChangeText={(val) => onChange('breed', val)}
      />
    </View>

    {/* ДИНАМИЧЕСКИЕ АТРИБУТЫ */}
    {currentCategory.availableAttributes.map((attr: any) => {
      
      // ВАРИАНТ 1: Выпадающий список (кнопки)
      if (attr.type === 'select' && attr.options) {
        return (
          <View key={attr.slug} className="mb-6">
            <Text className="text-gray-500 mb-2 font-medium ml-1">{attr.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {attr.options.map((option: string) => {
                const isSelected = data.attributes[attr.slug] === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => onSetAttribute(attr.slug, option)}
                    className={`px-4 py-2 rounded-full border mr-2 ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={isSelected ? 'text-white font-medium' : 'text-gray-600'}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );
      }

      // ВАРИАНТ 2: Текстовое или Числовое поле
      // (Рендерим обычный инпут, чтобы не было ошибки .map)
      if (attr.type === 'text' || attr.type === 'number') {
        return (
          <View key={attr.slug} className="mb-6">
            <Text className="text-gray-500 mb-2 font-medium ml-1">
              {attr.name} {attr.unit ? `(${attr.unit})` : ''}
            </Text>
            <TextInput
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
              placeholder={attr.name}
              value={data.attributes[attr.slug] || ''}
              onChangeText={(val) => onSetAttribute(attr.slug, val)}
              keyboardType={attr.type === 'number' ? 'numeric' : 'default'}
            />
          </View>
        );
      }

      return null;
    })}

    {/* ТЕГИ */}
    <View className="mb-6">
      <Text className="text-gray-500 mb-2 font-medium ml-1">Особенности здоровья</Text>
      <View className="flex-row flex-wrap gap-2">
        {tags.map((tag: any) => {
          const isActive = data.tags.includes(tag.id);
          return (
            <TouchableOpacity
              key={tag.id}
              onPress={() => onToggleTag(tag.id)}
              className={`px-3 py-2 rounded-lg border flex-row items-center gap-2 ${isActive ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
            >
              {isActive && <Ionicons name="checkmark-circle" size={16} color="green" />}
              <Text className={isActive ? 'text-green-800 font-medium' : 'text-gray-600'}>{tag.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>

    <View className="mb-4">
      <Text className="text-gray-500 mb-2 font-medium ml-1">Дата рождения</Text>
      <TextInput
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
        placeholder="YYYY-MM-DD"
        value={data.birth_date}
        onChangeText={(val) => onChange('birth_date', val)}
        keyboardType="numeric" 
      />
    </View>
  </View>
);

// --- ШАГ 3: ФОТО ---
const Step3Photo = ({ data, onChange }: any) => (
  <View className="items-center pt-10">
    <TouchableOpacity 
      className="w-56 h-56 bg-gray-50 rounded-full items-center justify-center border-4 border-dashed border-gray-200 mb-6 overflow-hidden shadow-sm"
      onPress={() => console.log('Camera')} 
    >
      {data.avatar ? (
        <Image source={{ uri: data.avatar }} className="w-full h-full" />
      ) : (
        <View className="items-center">
          <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-3">
            <Ionicons name="camera" size={40} color="#2563EB" />
          </View>
          <Text className="text-blue-600 font-bold text-lg">Загрузить фото</Text>
          <Text className="text-gray-400 text-xs mt-1">или сделать снимок</Text>
        </View>
      )}
    </TouchableOpacity>

    <View className="w-full px-6">
      <Text className="text-gray-500 mb-2 font-medium ml-1">О себе (Био)</Text>
      <TextInput
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 h-24"
        placeholder="Любит спать на клавиатуре..."
        multiline
        textAlignVertical="top"
        value={data.description}
        onChangeText={(val) => onChange('description', val)}
      />
    </View>
  </View>
);

export default function CreatePetScreen() {
  const { 
    step, formData, currentCategory, dictionaries, isSubmitting, 
    updateField, toggleTag, setAttribute, nextStep, prevStep, submit 
  } = useMobilePetForm();

  return (
    <View className="flex-1 bg-white">
      {/* HEADER */}
      <View className="flex-row items-center justify-between px-6 pt-12 pb-4">
        <TouchableOpacity onPress={prevStep} disabled={step === 1} className="w-10 h-10 items-center justify-center rounded-full bg-gray-100">
            {step > 1 ? <Ionicons name="arrow-back" size={24} color="black" /> : <Ionicons name="close" size={24} color="gray" />}
        </TouchableOpacity>
        <Text className="font-bold text-lg text-gray-900">
           {step === 1 ? 'Новый питомец' : step === 2 ? 'Особенности' : 'Финальный штрих'}
        </Text>
        <View className="w-10" /> 
      </View>

      {/* Progress */}
      <View className="px-6 mb-4 flex-row gap-2">
        {[1, 2, 3].map(i => (
          <View key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-gray-100'}`} />
        ))}
      </View>

      <ScrollView className="flex-1 px-6">
        {step === 1 && (
          <Step1Basic 
            data={formData} 
            dictionaries={dictionaries} 
            onChange={updateField} 
          />
        )}
        {step === 2 && (
          <Step2Details 
            data={formData} 
            currentCategory={currentCategory} 
            tags={dictionaries.tags}
            onChange={updateField}
            onToggleTag={toggleTag}
            onSetAttribute={setAttribute}
          />
        )}
        {step === 3 && (
          <Step3Photo 
            data={formData} 
            onChange={updateField} 
          />
        )}
        <View className="h-10" />
      </ScrollView>

      {/* FOOTER */}
      <View className="p-6 bg-white border-t border-gray-50 shadow-lg">
        <TouchableOpacity
          onPress={step === 3 ? submit : nextStep}
          disabled={isSubmitting}
          className={`w-full py-4 rounded-2xl items-center flex-row justify-center gap-2 ${isSubmitting ? 'bg-gray-300' : 'bg-blue-600'}`}
        >
          <Text className="text-white font-bold text-lg">
            {isSubmitting ? 'Сохраняем...' : step === 3 ? 'Создать карточку' : 'Продолжить'}
          </Text>
          {step < 3 && <Ionicons name="arrow-forward" size={20} color="white" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}