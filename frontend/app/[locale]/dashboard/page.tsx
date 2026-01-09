'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PetsActionBar from '@/components/dashboard/PetsActionBar';
import PetCard from '@/components/dashboard/PetCard';
import CreatePetModal from '@/components/dashboard/CreatePetModal';
import PetDetailsModal from '@/components/dashboard/PetDetailsModal'; // <--- 1. Убедись, что импорт есть

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
  owner_id: number; // <--- 2. Добавили owner_id, чтобы модалка знала, чье это
  images: { image: string; is_main: boolean }[];
  status?: string;
  tags?: { slug: string; name: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  
  // Состояния для Модалки СОЗДАНИЯ
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  // Состояния для Модалки ПРОСМОТРА (ДЕТАЛЕЙ) <--- 3. НОВЫЕ СТЕЙТЫ
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  // TODO: В будущем здесь мы будем получать ID текущего юзера из токена/профиля
  // Пока для теста можно передавать заглушку или проверять на бэке
  const currentUserId = 1; 

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
      }
    } catch (error) {
      console.error("Ошибка при загрузке питомцев:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyPets();
  }, [fetchMyPets]);

  // Обработчик клика по карточке
  const handleCardClick = (petId: number) => {
    setSelectedPetId(petId);     // Запоминаем, кого кликнули
    setDetailsModalOpen(true);   // Открываем модалку
  };

  if (!loading && !isAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 pt-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Войдите в систему</h1>
        <button 
          onClick={() => router.push('/login')}
          className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:opacity-90 transition shadow-lg"
        >
          Войти в аккаунт
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen pb-20 px-4 sm:px-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">

      <PetsActionBar />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Кнопка "Добавить" */}
        <PetCard 
            isAddButton 
            onClick={() => setCreateModalOpen(true)} 
        />

        {/* Список питомцев */}
        {loading ? (
           <div className="col-span-1 flex items-center justify-center h-64 text-gray-400">
             Загрузка...
           </div>
        ) : (
            myPets.map((pet) => (
                <PetCard 
                    key={pet.id} 
                    pet={pet} 
                    // <--- 4. ВОТ ЗДЕСЬ БЫЛА ОШИБКА. УБРАЛИ router.push
                    onClick={() => handleCardClick(pet.id)}
                />
            ))
        )}
      </div>

      {!loading && myPets.length === 0 && (
          <div className="mt-12 text-center col-span-full">
              <p className="text-gray-400 text-lg">У вас пока нет добавленных питомцев.</p>
          </div>
      )}

      {/* Модалка СОЗДАНИЯ */}
      <CreatePetModal 
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => fetchMyPets()}
      />

      {/* Модалка ДЕТАЛЕЙ (ПРОСМОТРА) <--- 5. ДОБАВИЛИ РЕНДЕР МОДАЛКИ */}
      <PetDetailsModal 
        isOpen={isDetailsModalOpen}
        petId={selectedPetId}
        currentUserId={currentUserId}
        onClose={() => {
            setDetailsModalOpen(false);
            setSelectedPetId(null);
        }}
      />

    </div>
  );
}