//web-portal/components/dashboard/PetsActionBar.tsx

'use client';

import React from 'react';
import { Sparkles, Cat, ChevronDown, Search } from 'lucide-react';

export default function PetsActionBar() {
  return (
    <div className="w-full max-w-4xl mx-auto mb-10">
      <div className="bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-2 flex items-center border border-gray-100 h-16 sm:h-20 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        
        {/* ЛЕВАЯ ЧАСТЬ: Выбор питомца */}
        <div className="hidden sm:flex items-center gap-3 px-6 cursor-pointer group border-r border-gray-200 h-10 min-w-[200px]">
          <div className="bg-gray-100 p-2 rounded-full group-hover:bg-gray-200 transition">
             <Cat size={20} className="text-gray-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Кого проверяем?</span>
            <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-gray-800">Выберите питомца</span>
                <ChevronDown size={14} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: Инпут (Что беспокоит?) */}
        <div className="flex-1 flex items-center gap-3 pl-4 sm:pl-6 pr-2">
            <Search size={20} className="text-gray-400 sm:hidden" />
            <input 
                type="text" 
                placeholder="Что беспокоит? (например: кот чихает...)" 
                className="w-full bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-400 text-base font-medium h-full"
            />
            
            {/* КНОПКА АНАЛИЗ */}
            <button className="bg-[#FFCBA4] hover:bg-[#ffbca0] text-black font-semibold rounded-full h-12 px-6 flex items-center gap-2 transition-transform active:scale-95 shadow-sm whitespace-nowrap">
                <Sparkles size={18} fill="black" className="opacity-75" />
                <span className="hidden sm:inline">Анализ</span>
            </button>
        </div>

      </div>
    </div>
  );
}