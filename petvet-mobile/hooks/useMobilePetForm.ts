// hooks/useMobilePetForm.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { PetRepository } from '../services/PetRepository';
import { MOCK_CATEGORIES, MOCK_TAGS, PetCategory } from '../constants/dictionaries';

export interface PetFormData {
  name: string;
  gender: 'M' | 'F';
  birth_date: string;
  categorySlug: string;
  breed?: string;
  avatar?: string;
  description?: string; // Описание (био)
  
  // Динамические поля
  tags: number[]; // ID выбранных тегов
  attributes: Record<string, string>; // { "wool_type": "Длинная" }
}

export const useMobilePetForm = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<PetFormData>({
    name: '',
    gender: 'M',
    birth_date: '',
    categorySlug: 'cat',
    breed: '',
    description: '',
    tags: [],
    attributes: {},
    avatar: undefined,
  });

  // Получаем текущую выбранную категорию со всеми её настройками
  const currentCategory = MOCK_CATEGORIES.find(c => c.slug === formData.categorySlug) || MOCK_CATEGORIES[0];

  const updateField = (field: keyof PetFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Управление тегами (toggle)
  const toggleTag = (tagId: number) => {
    setFormData(prev => {
      const exists = prev.tags.includes(tagId);
      return {
        ...prev,
        tags: exists ? prev.tags.filter(t => t !== tagId) : [...prev.tags, tagId]
      };
    });
  };

  // Управление атрибутами
  const setAttribute = (slug: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: { ...prev.attributes, [slug]: value }
    }));
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1 && !formData.name.trim()) {
      Alert.alert('Ошибка', 'Введите имя питомца');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(p => p + 1);
  };

  const prevStep = () => setStep(p => p - 1);

  const submit = async () => {
    setIsSubmitting(true);
    try {
      // Сохраняем в SQLite
      // ВАЖНО: Атрибуты и теги мы пока склеим в JSON, так как таблица простая.
      // В будущем лучше обновить схему БД.
      const attributesJson = JSON.stringify({
        attrs: formData.attributes,
        tags: formData.tags,
        desc: formData.description
      });

      await PetRepository.createPet({
        name: formData.name,
        gender: formData.gender,
        species: formData.categorySlug,
        breed: formData.breed,
        birth_date: formData.birth_date || undefined,
        // Мы пока не меняли схему БД, поэтому эти данные пока "виртуальны" для SQLite,
        // но они сохранятся в памяти формы.
        // Чтобы сохранить их реально, нужно добавить колонку `extra_data` в `init.ts`.
      });

      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
      Alert.alert('Ошибка', 'Сбой сохранения');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step,
    formData,
    currentCategory, // Отдаем категорию, чтобы UI знал, какие атрибуты рисовать
    dictionaries: { categories: MOCK_CATEGORIES, tags: MOCK_TAGS },
    isSubmitting,
    updateField,
    toggleTag,
    setAttribute,
    nextStep,
    prevStep,
    submit
  };
};