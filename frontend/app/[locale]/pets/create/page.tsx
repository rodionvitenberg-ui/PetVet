'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Check, ArrowLeft, Plus, Trash2, 
  HelpCircle, Globe, Lock, Copy, 
  User as UserIcon, Key, ChevronRight
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function CreatePetPage() {
  const router = useRouter();

  // === STATES ===
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);

  // Form
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedBreedId, setSelectedBreedId] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Result
  const [createdCredentials, setCreatedCredentials] = useState<{login: string, pass: string} | null>(null);

  // === EFFECTS ===
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    return () => previewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [previewUrls]);

  // === API HELPERS ===
  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch(`${API_URL}/api/categories/`);
      if (res.ok) setCategories(await res.json());
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
      setError('Не удалось загрузить параметры');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // === HANDLERS ===
  const handleSelectCategory = (id: number) => {
    if (selectedCategoryId !== id) setSelectedBreedId(null);
    setSelectedCategoryId(id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (files.length + newFiles.length > 5) {
        setError('Максимум 5 фотографий');
        return;
      }
      setFiles(prev => [...prev, ...newFiles]);
      setPreviewUrls(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
      setError('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Можно добавить тоаст
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!name || !gender || !selectedCategoryId) {
        setError('Заполните: Имя, Вид и Пол');
        return;
      }
      await fetchCategoryDetails(selectedCategoryId);
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
    setError('');
  };

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
        .map(([slug, value]) => ({ attribute_slug: slug, value: value }));

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
        is_public: isPublic
      };
      
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
        const errorMsg = Object.entries(data).map(([k,v]) => `${k}: ${v}`).join(', ');
        throw new Error(errorMsg || 'Ошибка создания');
      }

      const petData = await res.json();

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

      if (petData.generated_login && petData.generated_password) {
        setCreatedCredentials({
            login: petData.generated_login,
            pass: petData.generated_password
        });
        setStep(4);
      } else {
        router.push('/dashboard');
        router.refresh();
      }

    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTags = availableTags.filter(tag => {
      if (!tag.target_gender) return true;
      return tag.target_gender === gender;
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        
        {/* ХЕДЕР */}
        <div className="flex items-center gap-4 mb-6">
            {step < 4 && (
                <button 
                    onClick={() => step === 1 ? router.back() : setStep(prev => prev - 1 as any)}
                    className="p-2 bg-white hover:bg-gray-100 rounded-full transition text-gray-600 shadow-sm border border-gray-200"
                >
                    <ArrowLeft size={20} />
                </button>
            )}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {step === 1 ? 'Новый питомец' : 
                     step === 2 ? 'Детали' : 
                     step === 3 ? 'Фотографии' : 'Успех!'}
                </h1>
                <div className="flex gap-2 mt-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                            i === step ? 'bg-blue-600 w-12' : i < step ? 'bg-blue-200' : 'bg-gray-200'
                        }`} />
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-6 sm:p-8">
            
            {/* ШАГ 1: ОСНОВНОЕ */}
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Вид животного */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Кто у вас?</label>
                        {isLoadingCategories ? (
                           <div className="h-24 bg-gray-100 animate-pulse rounded-2xl" />
                        ) : (
                          <div className="grid grid-cols-3 gap-3">
                            {categories.filter(cat => !cat.parent).map((cat) => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => handleSelectCategory(cat.id)}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition active:scale-95 ${
                                        selectedCategoryId === cat.id 
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                                        : 'border-gray-100 bg-white hover:border-gray-300 text-gray-600'
                                    }`}
                                >
                                    <div className="mb-2 w-10 h-10 flex items-center justify-center">
                                        {cat.icon ? <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain" /> : <HelpCircle />}
                                    </div>
                                    <span className="text-xs font-bold capitalize">{cat.name}</span>
                                </button>
                            ))}
                          </div>
                        )}
                    </div>

                    {/* Порода */}
                    {selectedCategoryId && categories.some(c => c.parent === selectedCategoryId) && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-gray-700 mb-3">Порода</label>
                            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                {categories.filter(cat => cat.parent === selectedCategoryId).map((breed) => (
                                    <button 
                                      key={breed.id} 
                                      onClick={() => setSelectedBreedId(breed.id)}
                                      className={`px-4 py-3 text-sm rounded-xl border text-left transition truncate ${
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
                                    className="px-4 py-3 text-sm rounded-xl border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 text-left transition"
                                >
                                    Другая / Не знаю
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Пол */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">Пол</label>
                        <div className="flex gap-4">
                            <button onClick={() => setGender('M')} className={`flex-1 py-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition ${gender === 'M' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                Мальчик {gender === 'M' && <Check size={18} />}
                            </button>
                            <button onClick={() => setGender('F')} className={`flex-1 py-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition ${gender === 'F' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                Девочка {gender === 'F' && <Check size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Имя и Дата */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Кличка</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Например: Барсик" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Дата рождения</label>
                            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition" />
                        </div>
                    </div>

                    {/* Публичность */}
                    <div onClick={() => setIsPublic(!isPublic)} className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${isPublic ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition flex-shrink-0 ${isPublic ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white'}`}>
                            {isPublic && <Check size={14} className="text-white" />}
                        </div>
                        <div>
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                                {isPublic ? <Globe size={18} className="text-blue-600" /> : <Lock size={18} className="text-gray-500" />}
                                {isPublic ? 'Публичный профиль' : 'Приватный профиль'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                {isPublic ? 'Питомец виден в общей ленте всем пользователям.' : 'Питомец виден только вам и лечащему врачу.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ШАГ 2: ДЕТАЛИ */}
            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Атрибуты */}
                    <div className="space-y-4">
                        {availableAttributes.map(attr => (
                            <div key={attr.id}>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                                    {attr.name} {attr.unit && <span className="text-gray-400 normal-case">({attr.unit})</span>}
                                </label>
                                <input 
                                    type="text" 
                                    value={attributeValues[attr.slug] || ''} 
                                    onChange={(e) => setAttributeValues(prev => ({...prev, [attr.slug]: e.target.value}))}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none transition"
                                    placeholder="Введите значение..."
                                />
                            </div>
                        ))}
                    </div>

                    {/* Теги */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-4">Особенности</h3>
                        {filteredTags.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {filteredTags.map((tag) => {
                                    const isSelected = selectedTagIds.includes(tag.id);
                                    return (
                                        <button 
                                            key={tag.id} 
                                            onClick={() => setSelectedTagIds(prev => prev.includes(tag.id) ? prev.filter(i => i !== tag.id) : [...prev, tag.id])}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
                                                isSelected 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' 
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                            }`}
                                        >
                                            {tag.name}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-xl text-gray-400 text-sm text-center italic border border-dashed border-gray-200">
                                Для этого вида меток пока нет
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ШАГ 3: ФОТО */}
            {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {previewUrls.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-200 shadow-sm">
                                <img src={url} className="w-full h-full object-cover" alt="preview" />
                                <button 
                                    onClick={() => removeFile(idx)} 
                                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 backdrop-blur-md rounded-lg text-white transition shadow-sm"
                                >
                                    <Trash2 size={16} />
                                </button>
                                {idx === 0 && (
                                    <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-bold">Главное</span>
                                )}
                            </div>
                        ))}
                        
                        {files.length < 5 && (
                            <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition gap-2 group">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-white group-hover:text-blue-500 transition">
                                    <Plus size={24} className="text-gray-400 group-hover:text-blue-500" />
                                </div>
                                <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600">Добавить</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                        Первое загруженное фото станет аватаркой профиля.
                    </p>
                </div>
            )}

            {/* ШАГ 4: УСПЕХ */}
            {step === 4 && createdCredentials && (
                <div className="flex flex-col items-center text-center space-y-8 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-100 animate-bounce">
                        <Check size={40} strokeWidth={4} />
                    </div>
                    
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Профиль создан!</h2>
                        <p className="text-gray-500 mt-2">
                            Передайте эти данные владельцу для входа.
                        </p>
                        <p className="text-xs text-red-500 mt-1 font-bold bg-red-50 px-3 py-1 rounded-full inline-block">
                            Сохраните их сейчас, они показаны один раз!
                        </p>
                    </div>

                    <div className="w-full bg-gray-50 rounded-2xl border border-gray-200 p-5 space-y-4">
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                                    <UserIcon size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Логин</p>
                                    <p className="font-bold text-gray-900 truncate">{createdCredentials.login}</p>
                                </div>
                            </div>
                            <button onClick={() => copyToClipboard(createdCredentials.login)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition"><Copy size={20} /></button>
                        </div>

                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl shrink-0">
                                    <Key size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Пароль</p>
                                    <p className="font-mono font-bold text-gray-900 truncate">{createdCredentials.pass}</p>
                                </div>
                            </div>
                            <button onClick={() => copyToClipboard(createdCredentials.pass)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition"><Copy size={20} /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* ERROR MSG */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    {error}
                </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                {step === 4 ? (
                    <button 
                        onClick={() => router.push('/dashboard')} 
                        className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-black transition shadow-xl"
                    >
                        Вернуться на главную
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