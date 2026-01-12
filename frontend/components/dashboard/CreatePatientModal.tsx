'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, Check, ArrowLeft, Plus, Trash2, 
  HelpCircle, Phone, User as UserIcon, Info, UserPlus
} from 'lucide-react';

// === ТИПЫ ===
interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  sort_order?: number;
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

interface CreatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function CreatePatientModal({ isOpen, onClose, onSuccess }: CreatePatientModalProps) {
  const router = useRouter();

  // === UI STATES ===
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // === DATA STATES ===
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);

  // === FORM STATES (Пациент) ===
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedBreedId, setSelectedBreedId] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState('');
  
  // === FORM STATES (Владелец - вместо Public Toggle) ===
  const [tempOwnerName, setTempOwnerName] = useState('');
  const [tempOwnerPhone, setTempOwnerPhone] = useState('');

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => previewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [previewUrls]);

  const resetForm = () => {
    setStep(1);
    setName('');
    setGender('');
    setSelectedCategoryId(null);
    setSelectedBreedId(null);
    setBirthDate('');
    setTempOwnerName('');
    setTempOwnerPhone('');
    setSelectedTagIds([]);
    setAttributeValues({});
    setFiles([]);
    setPreviewUrls([]);
    setError('');
    setAvailableTags([]);
    setAvailableAttributes([]);
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch(`${API_URL}/api/categories/`);
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchCategoryDetails = async (categoryId: number) => {
    setIsLoadingDetails(true);
    setError('');
    const token = localStorage.getItem('access_token');
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      const [tagsRes, attrsRes] = await Promise.all([
        fetch(`${API_URL}/api/categories/${categoryId}/tags/`, { headers }),
        fetch(`${API_URL}/api/categories/${categoryId}/attributes/`, { headers })
      ]);

      if (tagsRes.ok) setAvailableTags(await tagsRes.json());
      if (attrsRes.ok) setAvailableAttributes(await attrsRes.json());

    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить параметры вида');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSelectCategory = (id: number) => {
    if (selectedCategoryId !== id) {
        setSelectedBreedId(null);
    }
    setSelectedCategoryId(id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Валидация
      const validFiles = newFiles.filter(file => {
          const isImage = file.type.startsWith('image/');
          const isSizeValid = file.size <= 5 * 1024 * 1024; // 5MB
          return isImage && isSizeValid;
      });

      if (files.length + validFiles.length > 5) {
        setError('Максимум 5 фотографий');
        return;
      }
      
      setFiles(prev => [...prev, ...validFiles]);
      setPreviewUrls(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = async () => {
    if (step === 1) {
      // Валидация 1 шага
      if (!name || !gender || !selectedCategoryId) {
        setError('Заполните обязательные поля питомца');
        return;
      }
      if (!tempOwnerPhone) {
        setError('Телефон владельца обязателен для связи');
        return;
      }
      
      // Загружаем детали для 2 шага
      await fetchCategoryDetails(selectedCategoryId);
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
    setError('');
  };

  const handlePrevStep = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    setError('');
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const filteredTags = availableTags.filter(tag => {
      if (!tag.target_gender) return true;
      return tag.target_gender === gender;
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');

      const categoriesToSend = [];
      if (selectedCategoryId) categoriesToSend.push(selectedCategoryId);
      if (selectedBreedId) categoriesToSend.push(selectedBreedId);
      
      const attributesPayload = Object.entries(attributeValues)
        .filter(([_, value]) => value.trim() !== '')
        .map(([slug, value]) => ({
            attribute_slug: slug,
            value: value
        }));

      const selectedTagSlugs = availableTags
        .filter(t => selectedTagIds.includes(t.id))
        .map(t => t.slug);

      const payload = {
        name,
        gender,
        birth_date: birthDate || null,
        categories: categoriesToSend,
        tags: selectedTagSlugs,
        attributes: attributesPayload,
        is_public: false, // Пациенты всегда приватны
        // Данные владельца
        temp_owner_name: tempOwnerName,
        temp_owner_phone: tempOwnerPhone
      };
      
      // 1. Создаем
      const res = await fetch(`${API_URL}/api/pets/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMsg = Object.values(data).flat().join(', ');
        throw new Error(errorMsg || 'Ошибка создания');
      }

      const petData = await res.json();

      // 2. Загружаем фото
      if (files.length > 0) {
        for (const file of files) {
            const formData = new FormData();
            formData.append('image', file);
            if (file === files[0]) formData.append('is_main', 'true');

            await fetch(`${API_URL}/api/pets/${petData.id}/upload_image/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
        }
      }

      onSuccess(); 
      router.refresh();
      setStep(4); // Показываем экран успеха

    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 4 ? onClose : undefined}/>

      <div className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && step < 4 && (
              <button onClick={handlePrevStep} className="mr-1 p-1 hover:bg-gray-100 rounded-full">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-800">
              {step === 4 ? 'Готово' : step === 1 ? 'Новый пациент' : step === 2 ? 'Детали' : 'Фотографии'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* --- STEP 1 --- */}
        {step === 1 && (
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* БЛОК ВЛАДЕЛЬЦА (Вместо Public Toggle) */}
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                    <UserPlus size={16} />
                    Данные владельца
                </div>
                <div className="grid grid-cols-1 gap-3">
                    <input 
                        type="text"
                        placeholder="Имя (например: Анна)"
                        value={tempOwnerName}
                        onChange={e => setTempOwnerName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white border border-blue-100 focus:border-blue-400 outline-none text-sm transition"
                    />
                    <div className="relative">
                        <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input 
                            type="tel"
                            placeholder="Телефон (обязательно)"
                            value={tempOwnerPhone}
                            onChange={e => setTempOwnerPhone(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-blue-100 focus:border-blue-400 outline-none text-sm transition font-medium"
                        />
                    </div>
                </div>
                <p className="text-[10px] text-blue-600/70 leading-tight">
                    Карточка будет привязана к этому номеру при регистрации клиента.
                </p>
            </div>

            <hr className="border-gray-100" />

            {/* КАТЕГОРИИ */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Кто пациент?</label>
                
                {isLoadingCategories ? (
                   <div className="h-24 bg-gray-100 animate-pulse rounded-2xl"></div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {categories
                      .filter(cat => !cat.parent)
                      .map((cat) => {
                        const isActive = selectedCategoryId === cat.id;
                        return (
                          <button 
                            key={cat.id} 
                            onClick={() => handleSelectCategory(cat.id)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition active:scale-95 ${
                              isActive 
                                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                                : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <div className="mb-1 w-8 h-8 flex items-center justify-center">
                                {cat.icon ? (
                                    <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain" />
                                ) : (
                                    <HelpCircle className={isActive ? 'text-blue-500' : 'text-gray-400'} />
                                )}
                            </div>
                            <span className="text-xs font-bold capitalize text-center leading-tight">
                                {cat.name}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* ПОРОДА */}
              {selectedCategoryId && categories.some(c => c.parent === selectedCategoryId) && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Порода</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200">
                      {categories
                        .filter(cat => cat.parent === selectedCategoryId)
                        .map((breed) => {
                          const isBreedActive = selectedBreedId === breed.id;
                          return (
                            <button 
                              key={breed.id} 
                              onClick={() => setSelectedBreedId(breed.id)}
                              className={`px-3 py-2 text-sm rounded-xl border text-left transition truncate ${
                                isBreedActive 
                                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' 
                                  : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                              }`}
                            >
                              {breed.name}
                            </button>
                          );
                        })}
                         <button 
                              onClick={() => setSelectedBreedId(null)} 
                              className="px-3 py-2 text-sm rounded-xl border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 text-left transition"
                            >
                              Другая / Не знаю
                        </button>
                    </div>
                  </div>
              )}
            </div>

            {/* ПОЛ */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Пол</label>
              <div className="flex gap-4">
                <button onClick={() => setGender('M')}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition ${
                    gender === 'M' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                  }`}
                >Мальчик {gender === 'M' && <Check size={16} />}</button>
                <button onClick={() => setGender('F')}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition ${
                    gender === 'F' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                  }`}
                >Девочка {gender === 'F' && <Check size={16} />}</button>
              </div>
            </div>

            {/* ИМЯ И ДАТА */}
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Кличка</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Например: Барсик" 
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 border border-transparent outline-none transition" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Дата рождения (примерно)</label>
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 focus:bg-white outline-none border border-transparent focus:border-blue-500 transition" />
               </div>
            </div>

          </div>
        )}

        {/* --- STEP 2 (ДЕТАЛИ) --- */}
        {step === 2 && (
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
             {availableAttributes.map(attr => (
                <div key={attr.id}>
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">{attr.name} {attr.unit && `(${attr.unit})`}</label>
                    <input type="text" 
                        value={attributeValues[attr.slug] || ''} 
                        onChange={(e) => setAttributeValues(prev => ({...prev, [attr.slug]: e.target.value}))}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 border border-transparent outline-none transition text-sm font-medium"
                        placeholder="Введите значение..."
                    />
                </div>
             ))}

             <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Особенности</h3>
                {filteredTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {filteredTags.map((tag) => {
                            const isSelected = selectedTagIds.includes(tag.id);
                            return (
                                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                                    isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-gray-200 hover:border-gray-400 text-gray-700'
                                }`}>
                                {tag.name}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm italic">Для этого вида меток пока нет.</p>
                )}
             </div>
          </div>
        )}

        {/* --- STEP 3 (ФОТО) --- */}
        {step === 3 && (
            <div className="p-6 flex flex-col h-full">
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200">
                            <img src={url} className="w-full h-full object-cover" alt="preview" />
                            <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition shadow-sm"><Trash2 size={14} /></button>
                        </div>
                    ))}
                    {files.length < 5 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition group">
                            <Plus size={24} className="text-gray-400 group-hover:text-blue-500" />
                            <span className="text-[10px] text-gray-400 mt-1 font-medium group-hover:text-blue-500">Добавить</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                        </label>
                    )}
                </div>
                <p className="text-xs text-gray-400 text-center mt-auto">
                    Первое фото станет аватаркой питомца
                </p>
            </div>
        )}

        {/* --- STEP 4 (SUCCESS) --- */}
        {step === 4 && (
            <div className="p-6 flex flex-col items-center text-center space-y-6 justify-center h-full">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 animate-bounce">
                    <Check size={40} strokeWidth={3} />
                </div>
                
                <div>
                    <h3 className="text-2xl font-bold text-gray-800">Пациент создан!</h3>
                    <p className="text-gray-500 mt-2">
                        Карточка добавлена в ваш список пациентов.
                    </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 max-w-xs border border-gray-200">
                    Владелец сможет увидеть питомца, когда зарегистрируется с номером: <br/>
                    <span className="font-bold text-gray-900">{tempOwnerPhone}</span>
                </div>
            </div>
        )}

        {error && <div className="px-6 pb-2 text-red-500 text-sm font-medium animate-pulse text-center">{error}</div>}

        <div className="p-6 border-t border-gray-100 bg-white">
            {step === 4 ? (
                <button 
                    onClick={onClose} 
                    className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition shadow-lg"
                >
                    Закрыть
                </button>
            ) : (
                <button onClick={step < 3 ? handleNextStep : handleSubmit} disabled={isSubmitting}
                   className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                   {isSubmitting && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                   {step < 3 ? 'Далее' : isSubmitting ? 'Создаем...' : 'Готово'}
                </button>
            )}
        </div>

      </div>
    </div>
  );
}