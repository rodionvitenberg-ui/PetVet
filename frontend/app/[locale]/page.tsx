import React from 'react';
import { getTranslations } from 'next-intl/server';
import { PetBasic } from '@/types/pet';
import { HeroSection } from '@/components/home/HeroSection';
import { PetsGrid } from '@/components/home/PetsGrid';
import { AboutProject } from '@/components/home/AboutProject';
import { ForVeterinarians } from '@/components/home/ForVeterinarians';

// Функция получения данных (выполняется на сервере)
async function getPets(locale: string): Promise<PetBasic[]> {
  // Если переменная окружения не задана, используем локалхост
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  
  try {
    const res = await fetch(`${apiUrl}/api/pets/feed/`, {
      cache: 'no-store', // Данные не кэшируются, всегда свежие при обновлении страницы
      headers: {
        'Accept-Language': locale // <-- Просим Django вернуть данные на нужном языке (если бэкенд это умеет)
      }
    });

    if (!res.ok) {
      console.error(`Feed fetch error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    // Обработка пагинации (если DRF возвращает объект с results) или просто массива
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
  
  // Параллельная загрузка данных о питомцах и текстовых переводов
  const [publicPets, t] = await Promise.all([
    getPets(locale),
    getTranslations('HomePage') // 'HomePage' — это ключ в вашем en.json/ru.json
  ]);

  return (
    // Добавляем отступы, чтобы контент не перекрывался хедером
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans pt-24 pb-20">
      
      {/* Фильтр категорий */}

      <main className="max-w-[1920px] mx-auto px-4 sm:px-8 py-6">
        <HeroSection />
        <PetsGrid />
        <AboutProject />
        <ForVeterinarians />
      </main>
    </div>
  );
}