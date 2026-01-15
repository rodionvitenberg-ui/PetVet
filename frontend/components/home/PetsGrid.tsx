"use client";

import { useEffect, useState } from 'react';
import { PetDetail, UserProfile, TemporaryOwnerProfile, PetAttribute } from '@/types/pet'; // Импортируем типы, если они нужны, или оставляем локальные

// Локальный интерфейс (если не импортируешь из types)
interface PetImage {
  id: number;
  image: string;
  is_main: boolean;
}

interface PetBasic {
  id: number;
  name: string;
  images: PetImage[]; 
  slug?: string;
}

// Хелпер для URL
const getAbsoluteImageUrl = (url: string | undefined) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const cleanApiUrl = apiUrl.replace(/\/$/, '');
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  
  return `${cleanApiUrl}${cleanUrl}`;
};

export const PetsGrid = () => {
  const [pets, setPets] = useState<PetBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/pets/feed/?is_public=true`);
        
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        const results = Array.isArray(data) ? data : data.results || [];

        const shuffled = results
          .map((value: PetBasic) => ({ value, sort: Math.random() }))
          .sort((a: any, b: any) => a.sort - b.sort)
          .map(({ value }: any) => value)
          .slice(0, 40);

        setPets(shuffled);
      } catch (error) {
        console.error("Ошибка загрузки питомцев:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  const closeModal = () => setSelectedImage(null);

  if (loading) {
    return (
      // [FIX] Убрал bg-gray-50 и dark:bg-gray-900/50
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (pets.length === 0) return null;

  return (
    <>
      {/* [FIX] Убрал bg-gray-50 и dark:bg-gray-900/50. Теперь фон прозрачный. */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Наши пушистые пользователи
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {pets.map((pet) => {
              // Логика выбора картинки
              const mainImage = pet.images?.find(img => img.is_main) || pet.images?.[0];
              const fullAvatarUrl = getAbsoluteImageUrl(mainImage?.image);

              return (
                <div 
                  key={pet.id} 
                  className="block group relative cursor-pointer"
                  onClick={() => fullAvatarUrl && setSelectedImage(fullAvatarUrl)}
                >
                  <div className="aspect-square relative rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all hover:scale-105 duration-300 border border-gray-100 dark:border-gray-800">
                    {fullAvatarUrl ? (
                      <img
                        src={fullAvatarUrl}
                        alt={pet.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-300">
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                           <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </div>
                    )}
                    
                    {fullAvatarUrl && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                        <span className="text-white font-medium truncate w-full text-sm">
                          {pet.name}
                        </span>
                        <div className="absolute top-2 right-2 text-white/80">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                             <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm1 1v12h12V4H4z" clipRule="evenodd" />
                             <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM6 8a2 2 0 114 0 2 2 0 01-4 0zm3 6a5.98 5.98 0 00-4.474 1.979l-.11.135.632.774.11-.134A4.98 4.98 0 019 15h6a4.98 4.98 0 013.842 1.755l.11.134.632-.774-.11-.135A5.98 5.98 0 0015 14H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Модальное окно */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={closeModal}
        >
          <div className="relative w-full h-full max-w-5xl max-h-[90vh] p-4 flex items-center justify-center">
             <button 
                onClick={closeModal}
                className="absolute top-6 right-6 text-white/70 hover:text-white z-10 p-2 bg-black/20 rounded-full transition-colors"
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
             </button>

            <img
              src={selectedImage}
              alt="Pet full size"
              className="object-contain max-h-full max-w-full" 
            />
          </div>
        </div>
      )}
    </>
  );
};