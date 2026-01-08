import React from 'react';
import CategoryFilter from '@/components/CategoryFilter';
import PetCard from '@/components/dashboard/PetCard';
import { getTranslations } from 'next-intl/server';

interface Pet {
  id: number;
  name: string;
  breed: string;
  image?: string;
  status?: string;
  gender?: string;
  birth_date?: string;
}

// Функция получения данных (на сервере)
async function getPets(locale: string): Promise<Pet[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  
  try {
    const res = await fetch(`${apiUrl}/api/pets/feed/`, {
      cache: 'no-store', // Всегда свежие данные
      headers: {
        'Accept-Language': locale // <-- Самое важное: просим Django перевести данные
      }
    });

    if (!res.ok) {
      console.error(`Feed fetch error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
    
  } catch (error) {
    console.error('Network error:', error);
    return [];
  }
}

// Основной компонент страницы
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  // В Next.js 15 params нужно ожидать (await)
  const { locale } = await params;
  
  // Параллельная загрузка данных и переводов интерфейса
  const [publicPets, t] = await Promise.all([
    getPets(locale),
    getTranslations('HomePage')
  ]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pt-24 pb-20">
      
      {/* Фильтр категорий */}
      <CategoryFilter />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-8 py-6">
        
        {/* Заголовок секции (берется из json-словарей) */}
        <div className="mb-8 mt-4">
            <h1 className="text-3xl font-bold text-gray-800">{t('title')}</h1>
            <p className="text-gray-500 mt-2">{t('subtitle')}</p>
        </div>

        {/* Сетка питомцев */}
        {publicPets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {publicPets.map((pet) => (
                  <PetCard key={pet.id} pet={pet} />
              ))}
          </div>
        ) : (
          <div className="py-20 text-center text-gray-400">
            Список пока пуст
          </div>
        )}

      </main>
    </div>
  );
}