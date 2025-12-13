'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, Check, ArrowLeft,
  Cat, Dog, Rabbit, Bird, Fish, Rat, HelpCircle 
} from 'lucide-react';

// === ТИПЫ ===
interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
}

interface CreatePetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'cat': <Cat />,
  'dog': <Dog />,
  'rabbit': <Rabbit />,
  'bird': <Bird />,
  'fish': <Fish />,
  'rodent': <Rat />,
  'other': <HelpCircle />,
};

export default function CreatePetModal({ isOpen, onClose, onSuccess }: CreatePetModalProps) {
  const router = useRouter();

  // === UI STATES ===
  const [step, setStep] = useState<1 | 2>(1); // Текущий шаг
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // === DATA STATES ===
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]); // Теги, пришедшие с бека

  // === FORM STATES ===
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]); // Выбранные теги

  // 1. Загрузка категорий при открытии
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Сброс шага на первый при открытии
      setStep(1);
      setSelectedTagIds([]);
      setError('');
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/categories/?leafs=true');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Загрузка тегов для конкретной категории
  const fetchTagsForCategory = async (categoryId: number) => {
    setIsLoadingTags(true);
    setError('');
    try {
      // ! ВАЖНО: Проверь этот URL. Обычно фильтр выглядит так: ?category=ID или ?categories=ID
      const res = await fetch(`http://127.0.0.1:8000/api/tags/?category=${categoryId}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableTags(data);
      } else {
        // Если тегов нет или ошибка, просто пустой массив, не блокируем работу
        setAvailableTags([]);
      }
    } catch (err) {
      console.error("Ошибка загрузки тегов", err);
      setAvailableTags([]);
    } finally {
      setIsLoadingTags(false);
    }
  };

  // === ЛОГИКА ПЕРЕХОДОВ ===

  const handleNextStep = async () => {
    // Валидация Шага 1
    if (!name || !gender || !selectedCategoryId) {
      setError('Заполните: Имя, Вид и Пол');
      return;
    }

    // Если всё ок, грузим теги и идем дальше
    await fetchTagsForCategory(selectedCategoryId);
    setStep(2);
    setError('');
  };

  const handlePrevStep = () => {
    setStep(1);
    setError('');
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId) 
        : [...prev, tagId]
    );
  };

  // === ФИНАЛЬНАЯ ОТПРАВКА ===
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      
      const payload = {
        name: name,
        gender: gender,
        birth_date: birthDate || null,
        categories: [selectedCategoryId],
        tags: selectedTagIds // Отправляем массив ID тегов
      };

      const res = await fetch('http://127.0.0.1:8000/api/pets/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess(); 
        router.refresh();
        handleClose();
      } else {
        const data = await res.json();
        const errorMsg = Object.values(data).flat().join(', ');
        setError(errorMsg || 'Ошибка при создании');
      }
    } catch (err) {
      setError('Ошибка сети. Проверьте подключение.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setGender('');
    setSelectedCategoryId(null);
    setBirthDate('');
    setSelectedTagIds([]);
    setError('');
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={handlePrevStep} className="mr-1 p-1 hover:bg-gray-100 rounded-full transition">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-800">
              {step === 1 ? 'Новый питомец' : 'Особенности'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* --- STEP 1: ОСНОВНАЯ ИНФА --- */}
        {step === 1 && (
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Вид */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Кто у вас?</label>
              {isLoadingCategories ? (
                 <div className="flex gap-2 animate-pulse h-20 bg-gray-100 rounded-2xl"></div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat) => {
                    const icon = ICON_MAP[cat.slug] || <HelpCircle />;
                    const isActive = selectedCategoryId === cat.id;
                    return (
                      <button 
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition ${
                          isActive ? 'border-black bg-black text-white' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-300'
                        }`}
                      >
                        <div className="mb-1">{icon}</div>
                        <span className="text-xs font-bold capitalize">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Пол */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Пол</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setGender('M')}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition font-medium
                    ${gender === 'M' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-blue-200'}`}
                >
                  Мальчик {gender === 'M' && <Check size={16} />}
                </button>
                <button 
                  onClick={() => setGender('F')}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition font-medium
                    ${gender === 'F' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-500 hover:border-pink-200'}`}
                >
                  Девочка {gender === 'F' && <Check size={16} />}
                </button>
              </div>
            </div>

            {/* Имя и Дата */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Кличка</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Барсик"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-black outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Дата рождения</label>
                <input 
                  type="date" 
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 2: ТЕГИ --- */}
        {step === 2 && (
          <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
            <div className="bg-blue-50 p-4 rounded-2xl">
                <p className="text-sm text-blue-800 font-medium">
                   Выберите особенности вашего питомца. Это поможет нам давать более точные советы.
                </p>
            </div>

            <label className="block text-sm font-bold text-gray-700">Особенности</label>
            
            {isLoadingTags ? (
               <div className="flex flex-wrap gap-2 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-8 w-20 bg-gray-100 rounded-full"></div>)}
               </div>
            ) : availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition
                        ${isSelected 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Для этой категории пока нет специальных тегов.</p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-6 pb-2">
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg animate-pulse">
              {error}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          {step === 1 ? (
             <button 
               onClick={handleNextStep}
               className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition active:scale-[0.98]"
             >
               Далее
             </button>
          ) : (
             <button 
               onClick={handleSubmit}
               disabled={isSubmitting}
               className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition active:scale-[0.98] disabled:opacity-50"
             >
               {isSubmitting ? 'Создаем...' : 'Добавить питомца'}
             </button>
          )}
        </div>

      </div>
    </div>
  );
}