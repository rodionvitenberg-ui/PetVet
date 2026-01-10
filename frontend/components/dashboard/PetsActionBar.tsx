'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Cat, ChevronDown, Search, Check, Dog, HelpCircle } from 'lucide-react';
import AIConsultModal from './AIConsultModal'; // <--- 1. Импорт модального окна

// Минимальный интерфейс питомца для селектора
interface PetBasic {
  id: number;
  name: string;
  gender: 'M' | 'F';
  categories: {
      id: number;
      name: string;
      icon?: string; // URL иконки с бэка
  }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PetsActionBar() {
  // === STATE ===
  const [pets, setPets] = useState<PetBasic[]>([]);
  const [selectedPet, setSelectedPet] = useState<PetBasic | null>(null);
  const [query, setQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false); // Открыт ли список
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 2. Новое состояние для отображения модального окна AI
  const [showAIModal, setShowAIModal] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // === FETCH PETS ===
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const res = await fetch(`${API_URL}/api/pets/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setPets(data);
          // Если питомцы есть, выбираем первого по умолчанию
          if (data.length > 0) {
            setSelectedPet(data[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load pets", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPets();
  }, []);

  // Закрытие дропдауна при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // === HANDLERS ===
  const handleSelect = (pet: PetBasic) => {
    setSelectedPet(pet);
    setIsOpen(false);
  };

  const handleAnalyze = () => {
    if (!selectedPet || !query.trim()) return;

    // Вместо спиннера и алерта - просто открываем модалку
    // Сама модалка внутри себя запустит анимацию загрузки
    setShowAIModal(true);
  };

  // Хелпер для иконки (если с бэка пришла картинка - ставим её, нет - дефолт)
  const renderPetIcon = (pet: PetBasic | null) => {
    // 1. Если есть иконка категории с бэкенда
    const catIcon = pet?.categories?.[0]?.icon;
    if (catIcon) {
        return <img src={catIcon} alt="icon" className="w-5 h-5 object-contain opacity-70" />;
    }
    
    // 2. Фолбэк на иконки Lucide (по названию категории, если нужно, или просто Cat)
    return <Cat size={20} className="text-gray-600" />;
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto mb-10 relative z-20"> 
        {/* z-20 чтобы выпадающий список был поверх остального контента */}
        
        <div className="bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-2 flex items-center border border-gray-100 h-16 sm:h-20 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          
          {/* ЛЕВАЯ ЧАСТЬ: Выбор питомца (DROPDOWN) */}
          <div 
              className="hidden sm:flex items-center gap-3 px-6 cursor-pointer group border-r border-gray-200 h-10 min-w-[200px] relative"
              onClick={() => !isLoading && setIsOpen(!isOpen)}
              ref={dropdownRef}
          >
            {/* Иконка текущего питомца */}
            <div className="bg-gray-100 p-2 rounded-full group-hover:bg-gray-200 transition shrink-0">
               {isLoading ? <div className="w-5 h-5 bg-gray-300 rounded-full animate-pulse" /> : renderPetIcon(selectedPet)}
            </div>
  
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">
                  {isLoading ? 'Загрузка...' : 'Кого проверяем?'}
              </span>
              <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-gray-800 truncate max-w-[120px]">
                      {selectedPet ? selectedPet.name : 'Нет питомцев'}
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
  
            {/* ВЫПАДАЮЩИЙ СПИСОК */}
            {isOpen && pets.length > 0 && (
              <div className="absolute top-full left-0 mt-4 w-[240px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-150">
                  {pets.map(pet => (
                      <div 
                          key={pet.id}
                          onClick={(e) => {
                              e.stopPropagation(); // Чтобы клик не сработал на родителя и не открыл меню снова
                              handleSelect(pet);
                          }}
                          className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition cursor-pointer ${selectedPet?.id === pet.id ? 'bg-blue-50/50' : ''}`}
                      >
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                              {renderPetIcon(pet)}
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${selectedPet?.id === pet.id ? 'text-blue-600' : 'text-gray-800'}`}>
                                  {pet.name}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                  {pet.categories.map(c => c.name).join(', ') || 'Без категории'}
                              </p>
                          </div>
                          {selectedPet?.id === pet.id && <Check size={16} className="text-blue-600" />}
                      </div>
                  ))}
                  
                  {/* Кнопка добавления (опционально) */}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                       <a href="/pets/create" className="block px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 text-center">
                          + Добавить питомца
                       </a>
                  </div>
              </div>
            )}
          </div>
  
          {/* ПРАВАЯ ЧАСТЬ: Инпут */}
          <div className="flex-1 flex items-center gap-3 pl-4 sm:pl-6 pr-2">
              <Search size={20} className="text-gray-400 sm:hidden" />
              <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder={selectedPet ? `Что беспокоит ${selectedPet.name}?` : "Выберите питомца..."}
                  disabled={!selectedPet || isLoading}
                  className="w-full bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-400 text-base font-medium h-full disabled:opacity-50"
              />
              
              {/* КНОПКА АНАЛИЗ */}
              <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !query.trim() || !selectedPet}
                  className={`
                      font-semibold rounded-full h-12 px-6 flex items-center gap-2 transition-all active:scale-95 shadow-sm whitespace-nowrap
                      ${(isAnalyzing || !query.trim()) 
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                          : 'bg-[#FFCBA4] hover:bg-[#ffbca0] text-black'
                      }
                  `}
              >
                  {/* Убрали спиннер отсюда, так как загрузка теперь внутри модалки */}
                  <Sparkles size={18} fill="black" className="opacity-75" />
                  <span className="hidden sm:inline">
                      Анализ
                  </span>
              </button>
          </div>
  
        </div>
      </div>

      {/* 3. Рендерим модалку AI (Условно) */}
      {selectedPet && (
          <AIConsultModal 
              isOpen={showAIModal}
              onClose={() => setShowAIModal(false)}
              petId={selectedPet.id}
              petName={selectedPet.name}
              petSpecies={selectedPet.categories?.[0]?.name || 'Питомец'}
              query={query}
          />
      )}
    </>
  );
}