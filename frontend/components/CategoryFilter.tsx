//web-portal/components/CategoryFilter.tsx

'use client';

import React, { useState } from 'react';
// Импортируем иконки для категорий (опционально, для красоты)
import { Cat, Dog, Bird, Sparkles, Trophy, LayoutGrid } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'Все', icon: LayoutGrid },
  { id: 'cats', label: 'Кошки', icon: Cat },
  { id: 'dogs', label: 'Собаки', icon: Dog },
  { id: 'exotic', label: 'Экзотика', icon: Bird },
  { id: 'funny', label: 'Смешные', icon: Sparkles },
  { id: 'hero', label: 'Герои', icon: Trophy },
];

export default function CategoryFilter() {
  const [activeCategory, setActiveCategory] = useState('all');

  return (
    <div className="w-full bg-filter-bg pt-24 pb-4 sticky top-0 z-40 shadow-sm md:shadow-none">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
        <div className="flex gap-8 overflow-x-auto no-scrollbar pb-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  flex flex-col items-center gap-2 min-w-[64px] cursor-pointer group transition-all
                  ${isActive 
                    ? 'text-black border-b-2 border-black pb-2' 
                    : 'text-gray-500 hover:text-black border-b-2 border-transparent hover:border-gray-200 pb-2'
                  }
                `}
              >
                <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-xs font-medium whitespace-nowrap">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}