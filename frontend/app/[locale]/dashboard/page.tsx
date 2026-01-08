'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl'; // Если используешь переводы
import { Plus } from 'lucide-react';

// Импорты компонентов
import PetsActionBar from '@/components/dashboard/PetsActionBar';
import PetCard from '@/components/dashboard/PetCard';
import CreatePetModal from '@/components/dashboard/CreatePetModal';
import PetDetailsModal from '@/components/dashboard/PetDetailsModal';
import { useAuth } from '@/components/providers/AuthProvider';

// === ИНТЕРФЕЙСЫ ===
interface PetAttribute {
  attribute: {
    slug: string;
    name: string;
    name_ru?: string;
    name_en?: string;
    icon?: string;
  };
  value: string;
}

interface Pet {
  id: number;
  name: string;
  attributes: PetAttribute[];
  age: string;
  gender: 'M' | 'F';
  is_public: boolean;
  owner_id: number;
  clinic_name?: string; // Если нужно
  images: { image: string; is_main: boolean }[];
  status?: string;
  tags?: { slug: string; name: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  // const t = useTranslations('Dashboard'); // Если нужно
  
  // 1. ПОДКЛЮЧАЕМ AUTH PROVIDER
  const { user, isAuth, isLoading: isAuthLoading } = useAuth();

  // Состояния данных
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [isPetsLoading, setIsPetsLoading] = useState(true); // Загрузка именно питомцев

  // Состояния модалок
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  // 2. ЗАЩИТА СТРАНИЦЫ (Редирект)
  useEffect(() => {
    // Ждем окончания загрузки AuthProvider. Если после этого мы не авторизованы — редирект.
    if (!isAuthLoading && !isAuth) {
      router.push('/login');
    }
  }, [isAuth, isAuthLoading, router]);

  // 3. ФУНКЦИЯ ЗАГРУЗКИ ПИТОМЦЕВ
  const fetchMyPets = useCallback(async () => {
    try {
      setIsPetsLoading(true);
      const res = await fetch('/api/pets/'); // Убедись, что путь API верный
      if (res.ok) {
        const data = await res.json();
        setMyPets(data);
      } else {
        console.error('Failed to fetch pets');
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setIsPetsLoading(false);
    }
  }, []);

  // 4. ЭФФЕКТ ЗАГРУЗКИ ДАННЫХ
  // Запускаем только если мы авторизованы
  useEffect(() => {
    if (isAuth && !isAuthLoading) {
      fetchMyPets();
    }
  }, [isAuth, isAuthLoading, fetchMyPets]);

  // Хендлер клика по карточке (открывает детали)
  const handleCardClick = (id: number) => {
    setSelectedPetId(id);
  };

  // 5. ПОКАЗЫВАЕМ СПИННЕР, ПОКА ПРОВЕРЯЕМ АВТОРИЗАЦИЮ
  // Это предотвращает "мигание" контента перед редиректом
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Если не авторизован (и эффект редиректа еще не сработал), возвращаем null
  if (!isAuth) return null;

  return (
    <div className="pt-24 px-4 sm:px-6 max-w-[1920px] mx-auto min-h-screen pb-12">
      
      {/* Приветствие */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
           {/* Можно использовать t('greeting') или имя юзера */}
           Привет, {user?.first_name || user?.username}!
        </h1>
        <p className="text-gray-500 mt-2">Вот ваши питомцы.</p>
      </div>

      <PetsActionBar />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
        
        {/* Кнопка "Добавить питомца" */}
        <PetCard 
            isAddButton 
            onClick={() => setCreateModalOpen(true)} 
        />

        {/* Список питомцев */}
        {isPetsLoading ? (
           // Скелетон или спиннер для списка
           <div className="col-span-1 flex items-center justify-center h-64 text-gray-400">
             Загрузка питомцев...
           </div>
        ) : (
            myPets.map((pet) => (
                <PetCard 
                    key={pet.id} 
                    pet={pet} 
                    onClick={() => handleCardClick(pet.id)}
                />
            ))
        )}
      </div>

      {!isPetsLoading && myPets.length === 0 && (
          <div className="mt-12 text-center col-span-full">
              <p className="text-gray-400 text-lg">У вас пока нет добавленных питомцев.</p>
          </div>
      )}

      {/* === МОДАЛКИ === */}
      
      {/* Создание */}
      <CreatePetModal 
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
            setCreateModalOpen(false);
            fetchMyPets();
        }}
      />

      {/* Детали (Просмотр) */}
      {selectedPetId && (
        <PetDetailsModal 
           petId={selectedPetId}
           isOpen={!!selectedPetId}
           onClose={() => setSelectedPetId(null)}
           // Если в модалке есть функции редактирования, можно добавить onSuccess={fetchMyPets}
        />
      )}

    </div>
  );
}