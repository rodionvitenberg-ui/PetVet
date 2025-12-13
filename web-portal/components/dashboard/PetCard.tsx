//web-portal/components/dashboard/PetCard.tsx

import React from 'react';
import { Plus, Activity, Share2, Mars, Venus } from 'lucide-react';

// Обновленный тип данных для питомца (как отдает наш Django бэкенд)
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
  attributes: PetAttribute[]; // <-- Теперь это массив, а не просто строка
  age: string;    
  gender: 'M' | 'F';
  is_public: boolean;
  images: { image: string; is_main: boolean }[]; 
  status?: string;
}

interface PetCardProps {
  isAddButton?: boolean; // Флаг: это кнопка "Добавить"?
  pet?: Pet;             // Данные питомца
  onClick?: () => void;  // Действие при клике
}

export default function PetCard({ isAddButton, pet, onClick }: PetCardProps) {
  
  // ВАРИАНТ 1: Кнопка "Добавить питомца" (Если isAddButton = true)
  if (isAddButton) {
    return (
      <div 
        onClick={onClick}
        className="aspect-[4/5] rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition group gap-4 bg-white/50"
      >
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center group-hover:scale-110 transition shadow-sm">
          <Plus size={32} className="text-gray-400 group-hover:text-gray-600" />
        </div>
        <span className="font-semibold text-gray-500 group-hover:text-gray-700">Добавить питомца</span>
      </div>
    );
  }

  // ВАРИАНТ 2: Карточка питомца (Если передали pet)
  if (!pet) return null;

  // --- ПОДГОТОВКА ДАННЫХ ---
  
  // 1. Берем картинку (первую из списка или null)
  const mainImage = pet.images && pet.images.length > 0 ? pet.images[0].image : null;

  // 2. Ищем породу внутри списка атрибутов (ищем slug='breed')
  const breedAttr = pet.attributes?.find(a => a.attribute.slug === 'breed' || a.attribute.slug === 'poroda');
  const breed = breedAttr ? breedAttr.value : 'Порода не указана';

  return (
    <div 
      onClick={onClick}
      className="group relative aspect-[4/5] rounded-3xl overflow-hidden cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 bg-white"
    >
      
      {/* 1. ФОТОГРАФИЯ */}
      <div className="absolute inset-0 bg-gray-100">
        {mainImage ? (
          <img 
            src={mainImage} 
            alt={pet.name}
            className="w-full h-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
           // Заглушка, если фото нет
           <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
              <span className="text-6xl opacity-50">🐾</span>
           </div>
        )}
      </div>

      {/* Затемнение снизу, чтобы текст читался */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />

      {/* 2. ВЕРХНЯЯ ЧАСТЬ (Статусы) */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        {/* Статус здоровья */}
        <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <Activity size={14} className="text-green-500" />
            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">
              {pet.status || "Здоров"}
            </span>
        </div>

        {/* Значок "Публичный", если is_public = true */}
        {pet.is_public && (
           <div className="bg-white/90 p-1.5 rounded-full text-blue-600 shadow-sm" title="Публичный профиль">
             <Share2 size={14} />
           </div>
        )}
      </div>

      {/* 3. НИЖНЯЯ ЧАСТЬ (Информация) */}
      <div className="absolute bottom-0 left-0 w-full p-5 text-white">
        
        <div className="flex justify-between items-end mb-1">
            <h3 className="text-2xl font-bold leading-tight">{pet.name}</h3>
            
            {/* Иконка пола (Марс/Венера) */}
            <div className="mb-1">
                {pet.gender === 'M' ? (
                   <Mars className="text-blue-300" size={20} />
                ) : (
                   <Venus className="text-pink-300" size={20} />
                )}
            </div>
        </div>

        {/* Порода и Возраст */}
        <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
            <span>{breed}</span>
            <span>•</span>
            <span>{pet.age || "Возраст скрыт"}</span>
        </div>
        
        {/* Цветная полоска пола в самом низу (Синяя или Розовая) */}
        <div className={`absolute bottom-0 left-0 h-1.5 w-full ${pet.gender === 'M' ? 'bg-blue-500' : 'bg-pink-500'}`} />
      </div>
    </div>
  );
}