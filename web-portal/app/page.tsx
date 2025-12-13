'use client';

import React, { useState, useEffect } from 'react';
import CategoryFilter from '@/components/CategoryFilter';
import PetCard from '@/components/dashboard/PetCard'; // Используем нашу универсальную карточку

interface Pet {
  id: number;
  name: string;
  breed: string;
  image?: string;
  status?: string;
}

export default function Home() {
  const [publicPets, setPublicPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        // Запрос к публичному эндпоинту (feed), который фильтрует по is_public=True
        const res = await fetch('http://127.0.0.1:8000/api/pets/feed/');
        
        if (res.ok) {
          const data = await res.json();
          // Если на бэкенде включена пагинация, данные могут быть в data.results
          // Если пагинации нет — data это сразу массив. Предполагаем массив или results:
          setPublicPets(Array.isArray(data) ? data : data.results || []);
        } else {
          console.error("Не удалось загрузить ленту");
        }
      } catch (error) {
        console.error("Ошибка сети:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, []);

  return (
    // pt-20 или pt-24 нужно, чтобы не наезжало на фиксированный хедер из layout.tsx
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans pt-24 pb-20">
      
      {/* Блок фильтров оставляем на главной */}
      <CategoryFilter />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-8 py-6">
        
        <div className="mb-8 mt-4">
            <h1 className="text-2xl font-bold text-gray-900">Исследуйте мир питомцев</h1>
            <p className="text-gray-500">Реальные питомцы нашего сообщества</p>
        </div>

        {/* СЕТКА ПУБЛИЧНЫХ ПИТОМЦЕВ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            
            {loading ? (
                // Простая заглушка загрузки
                <div className="col-span-full py-20 text-center text-gray-400">
                    Загружаем пушистых друзей...
                </div>
            ) : (
                publicPets.map((pet) => (
                    // isAddButton не передаем, здесь только просмотр
                    <PetCard key={pet.id} pet={pet} />
                ))
            )}

        </div>

        {/* Если лента пуста */}
        {!loading && publicPets.length === 0 && (
            <div className="text-center py-20">
                <h3 className="text-xl font-medium text-gray-700">Пока здесь тихо</h3>
                <p className="text-gray-500 mt-2">Станьте первым, кто опубликует своего питомца!</p>
            </div>
        )}

      </main>
    </div>
  );
}