// web-portal/app/dashboard.page.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PetsActionBar from '@/components/dashboard/PetsActionBar';
import PetCard from '@/components/dashboard/PetCard';
import CreatePetModal from '@/components/dashboard/CreatePetModal';

// === ИНТЕРФЕЙСЫ ===
interface PetAttribute {
  attribute: {
    slug: string;
    name: string;
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
  images: { image: string; is_main: boolean }[];
  status?: string;
  tags?: { slug: string; name: string }[]; // Добавил теги, раз мы их уже сделали
}
// =============================

export default function DashboardPage() {
  const router = useRouter();
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  
  // Состояние для открытия/закрытия модалки
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  // 1. Выносим логику загрузки в отдельную функцию
  // Используем useCallback, чтобы React не пересоздавал функцию при каждом рендере
  const fetchMyPets = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setIsAuth(false);
      setLoading(false);
      return; 
    }

    setIsAuth(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/pets/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setMyPets(data);
      } else if (res.status === 401) {
        setIsAuth(false);
        // router.push('/login'); // Можно раскомментировать, если нужно
      }
    } catch (error) {
      console.error("Ошибка при загрузке питомцев:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Вызываем загрузку при старте
  useEffect(() => {
    fetchMyPets();
  }, [fetchMyPets]);

  // Если не авторизован
  if (!loading && !isAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Войдите в систему</h1>
        <p className="text-gray-500 mb-6 max-w-md">
          Чтобы управлять здоровьем своих питомцев, нужно войти.
        </p>
        <button 
          onClick={() => router.push('/login')}
          className="bg-[#FF385C] text-white px-8 py-3 rounded-full font-medium hover:bg-[#e00b41] transition shadow-lg"
        >
          Войти в аккаунт
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen pb-20 px-4 sm:px-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">

      {/* Панель поиска и действий */}
      <PetsActionBar />

      {/* Сетка карточек */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* 1. Кнопка "Добавить" */}
        {/* ТЕПЕРЬ ОНА ОТКРЫВАЕТ МОДАЛКУ */}
        <PetCard 
            isAddButton 
            onClick={() => setCreateModalOpen(true)} 
        />

        {/* 2. Список питомцев */}
        {loading ? (
           <div className="col-span-1 flex items-center justify-center h-64 text-gray-400">
             Загрузка...
           </div>
        ) : (
            myPets.map((pet) => (
                <PetCard 
                    key={pet.id} 
                    pet={pet} 
                    onClick={() => router.push(`/pet/${pet.id}-${pet.slug}`)}
                />
            ))
        )}
      </div>

      {/* Если список пуст */}
      {!loading && myPets.length === 0 && (
          <div className="mt-12 text-center col-span-full">
              <p className="text-gray-400 text-lg">У вас пока нет добавленных питомцев.</p>
          </div>
      )}

      {/* 3. МОДАЛЬНОЕ ОКНО СОЗДАНИЯ */}
      <CreatePetModal 
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
            // Когда питомец создан, мы просто перезапрашиваем список
            fetchMyPets();
        }}
      />

    </div>
  );
}