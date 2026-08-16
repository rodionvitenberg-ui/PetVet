//web-portal/components/CategoryFilter.tsx

'use client';

import React, { useState } from 'react';
// Импортируем иконки для категорий (опционально, для красоты)
import { Cat, Dog, Bird, Sparkles, Trophy, LayoutGrid } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'cats', label: 'Cats', icon: Cat },
  { id: 'dogs', label: 'Dogs', icon: Dog },
  { id: 'exotic', label: 'Exotic', icon: Bird },
  { id: 'funny', label: 'Funny', icon: Sparkles },
  { id: 'hero', label: 'Heroes', icon: Trophy },
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
                    ? 'text-foreground border-b-2 border-foreground pb-2' 
                    : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-border pb-2'
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