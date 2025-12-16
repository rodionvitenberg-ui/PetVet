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
      categoryIds: [] as number[],
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

        setFormData({
            name: pet.name || '',
            gender: pet.gender || 'M',
            birth_date: pet.birth_date || '',
            description: pet.description || '',
            is_public: pet.is_public || false,
            is_active: pet.is_active ?? true,
            
            // Маппинг сложных полей
            categoryIds: pet.categories?.map((c: any) => c.id) || [],
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
    
    // Формируем payload
    const payload: any = {
        name: formData.name,
        gender: formData.gender,
        description: formData.description,
        is_public: formData.is_public,
        is_active: formData.is_active,
        categories: formData.categoryIds,
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
  const toggleCategory = (id: number) => {
      setFormData(prev => {
          const exists = prev.categoryIds.includes(id);
          return {
              ...prev,
              categoryIds: exists 
                 ? prev.categoryIds.filter(c => c !== id)
                 : [...prev.categoryIds, id]
          };
      });
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
            
            {/* STEP 1: BASIC INFO */}
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
                    
                    {/* Категории */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <MoreHorizontal size={16} className="text-blue-500" />
                            Вид животного
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {categories.filter(c => !c.parent).map(cat => { // Показываем только корневые или все, по желанию
                                const isSelected = formData.categoryIds.includes(cat.id);
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => toggleCategory(cat.id)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                                            isSelected 
                                            ? 'bg-blue-500 text-white border-blue-600 shadow-md' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

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