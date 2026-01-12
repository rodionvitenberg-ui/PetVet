'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Check, ArrowLeft, Plus, Trash2, 
  HelpCircle, UserPlus, Phone, ChevronRight,
  Info, Camera, UploadCloud
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function CreateClientPetPage() {
  const router = useRouter();
  const { user } = useAuth();

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
  
  // === FORM STATES (Владелец) ===
  const [tempOwnerName, setTempOwnerName] = useState('');
  const [tempOwnerPhone, setTempOwnerPhone] = useState('');

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === ЗАГРУЗКА ===
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    return () => previewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [previewUrls]);

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

  // === ФАЙЛЫ ===
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => {
          const isImage = file.type.startsWith('image/');
          const isSizeValid = file.size <= 5 * 1024 * 1024;
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

  // === НАВИГАЦИЯ ===
  const handleNextStep = async () => {
    if (step === 1) {
      // Валидация Шага 1
      if (!name || !gender || !selectedCategoryId) {
        setError('Заполните: Имя, Вид и Пол');
        return;
      }
      if (!tempOwnerPhone) {
        setError('Телефон владельца обязателен');
        return;
      }
      
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
    else if (step === 1) router.back();
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

  // === ОТПРАВКА ===
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
        is_public: false, // Всегда приватно для пациентов
        
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

      // 2. Фото
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

      setStep(4); // Успех

    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI для селектов
  const parentCategories = categories.filter(c => !c.parent);
  const breeds = selectedCategoryId 
    ? categories.filter(c => c.parent === selectedCategoryId) 
    : [];

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-10 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
            <button 
                onClick={handlePrevStep}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-gray-600 hover:text-gray-900 transition"
            >
                <ArrowLeft size={20} />
            </button>
            <div className="text-center">
                <h1 className="text-xl font-bold text-gray-900">
                    {step === 4 ? 'Готово' : 'Новый пациент'}
                </h1>
                {step < 4 && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= step ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300'}`} />
                        ))}
                    </div>
                )}
            </div>
            <div className="w-10" /> {/* Spacer */}
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            
            {/* STEP 1: ОСНОВНОЕ */}
            {step === 1 && (
                <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4">
                    
                    {/* КАТЕГОРИИ */}
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-gray-700">Кто пациент?</label>
                        {isLoadingCategories ? (
                            <div className="h-24 bg-gray-100 animate-pulse rounded-2xl"></div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3">
                                {parentCategories.map((cat) => {
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

                    {/* ПОРОДА (если есть) */}
                    {selectedCategoryId && breeds.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-gray-700">Порода</label>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {breeds.map((breed) => (
                                    <button 
                                        key={breed.id} 
                                        onClick={() => setSelectedBreedId(breed.id)}
                                        className={`px-3 py-2 text-sm rounded-xl border text-left transition truncate ${
                                            selectedBreedId === breed.id
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' 
                                            : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                                        }`}
                                    >
                                        {breed.name}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setSelectedBreedId(null)} 
                                    className="px-3 py-2 text-sm rounded-xl border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 text-left transition"
                                >
                                    Другая / Не знаю
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ИМЯ, ПОЛ, ДАТА */}
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Кличка</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder="Барсик" 
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 border border-transparent outline-none transition" 
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Пол</label>
                                <div className="flex bg-gray-100 rounded-xl p-1">
                                    <button onClick={() => setGender('M')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${gender === 'M' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                                    >М</button>
                                    <button onClick={() => setGender('F')}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${gender === 'F' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'}`}
                                    >Ж</button>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Дата рождения (если знаете)</label>
                            <input 
                                type="date" 
                                value={birthDate} 
                                onChange={e => setBirthDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 focus:bg-white outline-none border border-transparent focus:border-blue-500 transition" 
                            />
                        </div>
                    </div>

                    {/* БЛОК ВЛАДЕЛЬЦА (Вместо настройки публичности) */}
                    <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <UserPlus size={64} className="text-blue-600" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="flex items-center gap-2 text-blue-800 font-bold">
                                <UserPlus size={18} />
                                Владелец
                            </div>
                            
                            <div className="space-y-3">
                                <input 
                                    type="text"
                                    placeholder="Имя владельца"
                                    value={tempOwnerName}
                                    onChange={e => setTempOwnerName(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-white/80 border border-blue-100 focus:bg-white focus:border-blue-400 outline-none text-sm transition"
                                />
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input 
                                        type="tel"
                                        placeholder="Телефон (обязательно)"
                                        value={tempOwnerPhone}
                                        onChange={e => setTempOwnerPhone(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/80 border border-blue-100 focus:bg-white focus:border-blue-400 outline-none text-sm transition font-medium"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-blue-600/70 leading-tight">
                                Карточка автоматически привяжется к клиенту при его регистрации.
                            </p>
                        </div>
                    </div>

                </div>
            )}

            {/* STEP 2: ДЕТАЛИ (Атрибуты и Метки) */}
            {step === 2 && (
                <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-4">
                    {availableAttributes.map(attr => (
                        <div key={attr.id}>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                                {attr.name} {attr.unit && `(${attr.unit})`}
                            </label>
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
                            <p className="text-gray-400 text-sm italic">Нет доступных меток для этого вида.</p>
                        )}
                    </div>
                </div>
            )}

            {/* STEP 3: ФОТО */}
            {step === 3 && (
                <div className="p-6 h-[400px] flex flex-col animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold">
                        <Camera size={20} className="text-blue-500" />
                        Фотографии
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {previewUrls.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200 shadow-sm">
                                <img src={url} className="w-full h-full object-cover" alt="preview" />
                                <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition backdrop-blur-sm"><Trash2 size={14} /></button>
                            </div>
                        ))}
                        {files.length < 5 && (
                            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition group">
                                <UploadCloud size={24} className="text-gray-400 group-hover:text-blue-500 transition" />
                                <span className="text-[10px] text-gray-400 mt-1 font-medium group-hover:text-blue-500 transition">Добавить</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-auto">
                        Первое загруженное фото станет аватаркой.
                    </p>
                </div>
            )}

            {/* STEP 4: УСПЕХ */}
            {step === 4 && (
                <div className="p-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 min-h-[400px]">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <Check size={40} strokeWidth={3} />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Пациент создан!</h3>
                    <p className="text-gray-500 mb-6">
                        Карточка <b>{name}</b> успешно добавлена в вашу базу.
                    </p>

                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 max-w-xs w-full">
                        <p className="text-xs text-gray-500 mb-1">Привязка к клиенту:</p>
                        <p className="font-bold text-gray-900 text-lg">{tempOwnerPhone}</p>
                    </div>
                </div>
            )}

            {/* ОШИБКИ */}
            {error && (
                <div className="px-6 pb-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium animate-pulse border border-red-100">
                        <Info size={18} />
                        {error}
                    </div>
                </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-[2rem]">
                {step === 4 ? (
                    <button 
                        onClick={() => router.push('/dashboard')} 
                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-black transition shadow-xl"
                    >
                        Вернуться в кабинет
                    </button>
                ) : (
                    <button 
                        onClick={step < 3 ? handleNextStep : handleSubmit} 
                        disabled={isSubmitting}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Создаем...' : step < 3 ? (
                            <>Далее <ChevronRight size={20} /></>
                        ) : (
                            <>Готово <Check size={20} /></>
                        )}
                    </button>
                )}
            </div>

        </div>
      </div>
    </div>
  );
}