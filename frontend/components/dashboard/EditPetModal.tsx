'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Check, ArrowLeft, Trash2, 
  HelpCircle, MoreHorizontal
} from 'lucide-react';

// Повторяем интерфейсы (можно вынести в types.ts)
interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  parent?: number | null;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
  target_gender?: 'M' | 'F' | null;
}

interface Attribute {
  id: number;
  name: string;
  slug: string;
  unit?: string;
}

interface EditPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pet: any; // Полный объект питомца для предзаполнения
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function EditPetModal({ isOpen, onClose, onSuccess, pet }: EditPetModalProps) {
  // === STATES ===
  const [step, setStep] = useState<1 | 2>(1); // Только 2 шага
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Данные для справочников
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);

  // Форма
  const [formData, setFormData] = useState({
      name: '',
      gender: '' as 'M' | 'F',
      birth_date: '',
      description: '',
      is_public: false,
      is_active: true,
      selectedCategoryId: null as number | null,
      selectedBreedId: null as number | null,
      tagSlugs: [] as string[],
      attributeValues: {} as Record<string, string>,
  });

  // === PRE-FILL DATA ===
  useEffect(() => {
    if (isOpen && pet) {
        // Заполняем форму данными питомца
        const attrValues: Record<string, string> = {};
        pet.attributes?.forEach((pa: any) => {
            attrValues[pa.attribute.slug] = pa.value;
        });
        const petCategories = pet.categories || [];
        const parentCat = petCategories.find((c: any) => !c.parent);
        const childCat = petCategories.find((c: any) => c.parent);
        

        setFormData({
            name: pet.name || '',
            gender: pet.gender || 'M',
            birth_date: pet.birth_date || '',
            description: pet.description || '',
            is_public: pet.is_public || false,
            is_active: pet.is_active ?? true,
            
            // Маппинг сложных полей
            selectedCategoryId: parentCat ? parentCat.id : null,
            selectedBreedId: childCat ? childCat.id : null,
            tagSlugs: pet.tags?.map((t: any) => t.slug) || [],
            attributeValues: attrValues
        });
        
        // Сбрасываем на первый шаг при открытии
        setStep(1); 
    }
  }, [isOpen, pet]);

  // === LOAD DICTIONARIES ===
  useEffect(() => {
    if (isOpen) {
        Promise.all([
            fetch(`${API_URL}/api/categories/`).then(r => r.json()),
            fetch(`${API_URL}/api/tags/`).then(r => r.json()),
            fetch(`${API_URL}/api/attributes/`).then(r => r.json())
        ]).then(([cats, tgs, attrs]) => {
            setCategories(cats);
            setTags(tgs);
            setAttributes(attrs);
        }).catch(err => console.error("Ошибка загрузки справочников", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNextStep = () => {
    if (!formData.name) {
        setError('Укажите кличку питомца');
        return;
    }
    setError('');
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError('');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    const token = localStorage.getItem('access_token');
    const categoriesToSend = [];
    if (formData.selectedCategoryId) categoriesToSend.push(formData.selectedCategoryId);
    if (formData.selectedBreedId) categoriesToSend.push(formData.selectedBreedId);
    
    // Формируем payload
    const payload: any = {
        name: formData.name,
        gender: formData.gender,
        description: formData.description,
        is_public: formData.is_public,
        is_active: formData.is_active,
        categories: categoriesToSend,
        tags: formData.tagSlugs,
    };

    if (formData.birth_date) payload.birth_date = formData.birth_date;

    // Атрибуты
    const attrsToSend = Object.entries(formData.attributeValues).map(([slug, val]) => ({
        attribute_slug: slug,
        value: val
    }));
    if (attrsToSend.length > 0) payload.attributes = attrsToSend;

    try {
        const res = await fetch(`${API_URL}/api/pets/${pet.id}/`, {
            method: 'PATCH', // Используем PATCH для частичного обновления
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(JSON.stringify(errData));
        }

        onSuccess();
        onClose();

    } catch (err: any) {
        console.error(err);
        setError('Ошибка сохранения. Проверьте данные.');
    } finally {
        setIsSubmitting(false);
    }
  };

  // === RENDER HELPERS ===
  const handleSelectCategory = (id: number) => {
    if (formData.selectedCategoryId !== id) {
        // Если сменили вид - сбрасываем породу
        setFormData(prev => ({ ...prev, selectedCategoryId: id, selectedBreedId: null }));
    } else {
        // Если кликнули на тот же вид - ничего не меняем
        setFormData(prev => ({ ...prev, selectedCategoryId: id }));
    }
  };

  // Хендлер выбора Породы
  const handleSelectBreed = (id: number | null) => {
      setFormData(prev => ({ ...prev, selectedBreedId: id }));
  };

  const toggleTag = (slug: string) => {
      setFormData(prev => {
          const exists = prev.tagSlugs.includes(slug);
          return {
              ...prev,
              tagSlugs: exists
                 ? prev.tagSlugs.filter(t => t !== slug)
                 : [...prev.tagSlugs, slug]
          };
      });
  };

  const updateAttribute = (slug: string, val: string) => {
      setFormData(prev => ({
          ...prev,
          attributeValues: { ...prev.attributeValues, [slug]: val }
      }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-surface w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 bg-white">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
           <div className="flex items-center gap-3">
              {step > 1 && (
                  <button onClick={handleBack} className="p-1.5 hover:bg-white rounded-full transition text-gray-500">
                      <ArrowLeft size={20} />
                  </button>
              )}
              <h2 className="text-xl font-bold text-gray-800">Редактирование профиля</h2>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
               <X size={20} />
           </button>
        </div>

        {/* PROGRESS */}
        <div className="h-1 bg-gray-100 w-full flex">
            <div className={`h-full bg-blue-500 transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`} />
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {/* === STEP 1: BASIC INFO === */}
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Кличка *</label>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition outline-none text-gray-900"
                                placeholder="Например, Барсик"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Пол</label>
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setFormData({...formData, gender: 'M'})}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${formData.gender === 'M' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Мальчик
                                    </button>
                                    <button 
                                        onClick={() => setFormData({...formData, gender: 'F'})}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${formData.gender === 'F' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Девочка
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Дата рождения</label>
                                <input 
                                    type="date" 
                                    value={formData.birth_date}
                                    onChange={e => setFormData({...formData, birth_date: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-200 outline-none text-gray-900"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Заметки / Особые приметы</label>
                            <textarea 
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-200 transition outline-none h-24 resize-none text-gray-900"
                                placeholder="Особенности характера или внешности, привычки..."
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                             <span className="text-sm font-medium text-gray-700">Публичный профиль (виден всем)</span>
                             <input 
                                type="checkbox" 
                                checked={formData.is_public}
                                onChange={e => setFormData({...formData, is_public: e.target.checked})}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                             />
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: DETAILS */}
            {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    
                    {/* --- ЗАМЕНЯЕМ ЭТОТ БЛОК (Категории) --- */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <MoreHorizontal size={16} className="text-blue-500" />
                            Вид и Порода
                        </h3>
                        
                        {/* УРОВЕНЬ 1: ВИД */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            {categories
                              .filter(c => !c.parent) // Только родители (Собаки, Кошки...)
                              .map(cat => {
                                // Теперь проверяем через selectedCategoryId, а не массив
                                const isSelected = formData.selectedCategoryId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleSelectCategory(cat.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition active:scale-95 ${
                                            isSelected 
                                            ? 'border-blue-500 bg-blue-500 text-white shadow-md' 
                                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                                        }`}
                                    >
                                        <div className="mb-1 w-8 h-8 flex items-center justify-center">
                                            {cat.icon ? (
                                                <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <HelpCircle size={24} className={isSelected ? 'text-white' : 'text-gray-400'} />
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-center leading-tight">
                                            {cat.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* УРОВЕНЬ 2: ПОРОДА (Показываем только если выбран Вид) */}
                        {formData.selectedCategoryId && categories.some(c => c.parent === formData.selectedCategoryId) && (
                          <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Выберите породу</label>
                            
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                              {categories
                                .filter(cat => cat.parent === formData.selectedCategoryId)
                                .map((breed) => {
                                  // Проверяем через selectedBreedId
                                  const isBreedActive = formData.selectedBreedId === breed.id;
                                  return (
                                    <button 
                                      key={breed.id} 
                                      onClick={() => handleSelectBreed(breed.id)}
                                      className={`px-3 py-2.5 text-sm rounded-xl border text-left transition truncate ${
                                        isBreedActive 
                                          ? 'border-blue-500 bg-blue-100 text-blue-700 font-bold ring-1 ring-blue-500' 
                                          : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                                      }`}
                                    >
                                      {breed.name}
                                    </button>
                                  );
                                })}
                                
                                <button 
                                      onClick={() => handleSelectBreed(null)} 
                                      className={`px-3 py-2.5 text-sm rounded-xl border border-dashed border-gray-300 text-gray-500 hover:bg-white hover:text-gray-700 text-left transition ${!formData.selectedBreedId ? 'bg-white ring-1 ring-gray-300' : ''}`}
                                    >
                                      Другая / Не знаю
                                </button>
                            </div>
                          </div>
                        )}
                    </div>
                    {/* --- КОНЕЦ БЛОКА КАТЕГОРИЙ --- */}

                    {/* Атрибуты */}
                    <div>
                         <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <HelpCircle size={16} className="text-purple-500" />
                            Характеристики
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {attributes.map(attr => (
                                <div key={attr.id}>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">{attr.name} {attr.unit && `(${attr.unit})`}</label>
                                    <input 
                                        type="text"
                                        value={formData.attributeValues[attr.slug] || ''}
                                        onChange={(e) => updateAttribute(attr.slug, e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:border-blue-500 outline-none text-gray-900"
                                        placeholder="..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Теги */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Check size={16} className="text-green-500" />
                            Метки
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => {
                                const isSelected = formData.tagSlugs.includes(tag.slug);
                                if (tag.target_gender && tag.target_gender !== formData.gender) return null;
                                
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.slug)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                                            isSelected 
                                            ? 'bg-green-500 text-white border-green-600' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                                        }`}
                                    >
                                        {isSelected && <Check size={12} />}
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {error && <div className="px-6 pb-2 text-red-500 text-sm animate-pulse text-center">{error}</div>}

        {/* FOOTER */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button 
               onClick={step === 1 ? handleNextStep : handleSubmit} 
               disabled={isSubmitting}
               className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-200"
            >
               {step === 1 ? 'Далее' : isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
        </div>

      </div>
    </div>
  );
}