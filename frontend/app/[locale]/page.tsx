import React from 'react';
import { getTranslations } from 'next-intl/server';
import { PetBasic } from '@/types/pet';
import { HeroSection } from '@/components/home/HeroSection';
import { PetsGrid } from '@/components/home/PetsGrid';
import { AboutProject } from '@/components/home/AboutProject';
import { ForVeterinarians } from '@/components/home/ForVeterinarians';

// Функция получения данных (оставляем как была)
async function getPets(locale: string): Promise<PetBasic[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  
  try {
    const res = await fetch(`${apiUrl}/api/pets/feed/`, {
      cache: 'no-store',
      headers: {
        'Accept-Language': locale 
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

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  const [publicPets, t] = await Promise.all([
    getPets(locale),
    getTranslations('HomePage')
  ]);

  return (
    // 1. Убрали pt-24. Теперь фон начнется от самого верха экрана.
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans pb-20">
      
      {/* 2. Убрали ограничители ширины (max-w, px) и вертикальный паддинг (py-6) */}
      {/* Оставили space-y-20 для отступов между секциями */}
      <main className="w-full space-y-20">
        
        {/* Херо-секция теперь будет во всю ширину */}
        <HeroSection />
        
        {/* Остальные секции (они сами внутри себя имеют контейнеры, так что не сломаются) */}
        <PetsGrid />
        
        <AboutProject />
        
        <ForVeterinarians />
      
      </main>
    </div>
  );
}