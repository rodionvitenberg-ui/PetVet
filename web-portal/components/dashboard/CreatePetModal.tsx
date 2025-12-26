'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, Check, ArrowLeft, Plus, Trash2, 
  HelpCircle, MoreHorizontal, Globe, Lock,
  Copy, User as UserIcon, Key 
} from 'lucide-react';

// === ТИПЫ ===
interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
  sort_order?: number;
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

interface CreatePetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePetModal({ isOpen, onClose, onSuccess }: CreatePetModalProps) {
  const router = useRouter();

  // === UI STATES ===
  // Добавили 4-й шаг для отображения результатов
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Состояние для кнопки "Другие"
  const [showAllCategories, setShowAllCategories] = useState(false);

  // === DATA STATES ===
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);

  // === FORM STATES ===
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState('');
  
  // Новое поле: Публичный профиль
  const [isPublic, setIsPublic] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // === CREDENTIALS STATE ===
  // Сюда сохраним данные, которые вернет бэкенд
  const [createdCredentials, setCreatedCredentials] = useState<{login: string, pass: string} | null>(null);

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
    setBirthDate('');
    setIsPublic(false);
    setShowAllCategories(false);
    setSelectedTagIds([]);
    setAttributeValues({});
    setFiles([]);
    setPreviewUrls([]);
    setError('');
    setAvailableTags([]);
    setAvailableAttributes([]);
    setCreatedCredentials(null); // Сбрасываем креды
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/categories/?leafs=true');
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
        fetch(`http://127.0.0.1:8000/api/categories/${categoryId}/tags/`, { headers }),
        fetch(`http://127.0.0.1:8000/api/categories/${categoryId}/attributes/`, { headers })
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

  const handlePrevStep = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    // На 4-м шаге кнопки "Назад" не будет, но на всякий случай
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

  // Хелпер для копирования
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Тут можно добавить всплывающее уведомление, если есть компонент Toast
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      
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
        categories: [selectedCategoryId],
        tags: selectedTagSlugs,
        attributes: attributesPayload,
        is_public: isPublic
      };
      
      // 1. Создаем
      const res = await fetch('http://127.0.0.1:8000/api/pets/', {
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

      // 2. Загружаем фото
      if (files.length > 0) {
        for (const file of files) {
            const formData = new FormData();
            formData.append('image', file);
            if (file === files[0]) formData.append('is_main', 'true');

            await fetch(`http://127.0.0.1:8000/api/pets/${petData.id}/upload_image/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
        }
      }

      // 3. УСПЕХ: Обновляем список, но не закрываем модалку сразу
      onSuccess(); 
      router.refresh();

      // Если пришли данные для входа (логин/пароль), показываем их
      if (petData.generated_login && petData.generated_password) {
        setCreatedCredentials({
            login: petData.generated_login,
            pass: petData.generated_password
        });
        setStep(4); // Переход на экран успеха
      } else {
        // Если вдруг данных нет (старая логика или ошибка), просто закрываем
        onClose();
      }

    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleCategories = showAllCategories ? categories : categories.slice(0, 2);
  const hasHiddenCategories = categories.length > 2;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step === 4 ? onClose : undefined}/>

      <div className="relative bg-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-color flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Кнопку "Назад" показываем только на шагах 2 и 3 */}
            {step > 1 && step < 4 && (
              <button onClick={handlePrevStep} className="mr-1 p-1 hover:bg-secondary rounded-full">
                <ArrowLeft size={20} className="text-secondary-foreground" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-800">
              {step === 4 ? 'Клиент создан!' : step === 1 ? 'Новый клиент' : step === 2 ? 'Детали' : 'Фотографии'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-secondary rounded-full hover:brightness-95">
            <X size={20} className="text-secondary-foreground" />
          </button>
        </div>

        {/* --- STEP 1 --- */}
        {step === 1 && (
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* КАТЕГОРИИ */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Кто у вас?</label>
              
              {isLoadingCategories ? (
                 <div className="h-24 bg-secondary animate-pulse rounded-2xl"></div>
              ) : (
                <div className="grid grid-cols-3 gap-3 transition-all">
                  {visibleCategories.map((cat) => {
                    const isActive = selectedCategoryId === cat.id;
                    return (
                      <button 
                        key={cat.id} 
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition active:scale-95 ${
                          isActive 
                            ? 'border-primary bg-primary text-primary-foreground' 
                            : 'border-border-color bg-surface hover:border-gray-300'
                        }`}
                      >
                        <div className="mb-1 w-8 h-8 flex items-center justify-center">
                            {cat.icon ? (
                                <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain" />
                            ) : (
                                <HelpCircle className={isActive ? 'text-white' : 'text-gray-400'} />
                            )}
                        </div>
                        <span className="text-xs font-bold capitalize text-center leading-tight">
                            {cat.name}
                        </span>
                      </button>
                    );
                  })}

                  {!showAllCategories && hasHiddenCategories && (
                      <button 
                        onClick={() => setShowAllCategories(true)}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-border-color bg-secondary/50 text-gray-500 hover:bg-secondary hover:border-gray-400 transition"
                      >
                        <div className="mb-1 w-8 h-8 flex items-center justify-center">
                            <MoreHorizontal />
                        </div>
                        <span className="text-xs font-bold">Другие</span>
                      </button>
                  )}
                </div>
              )}
            </div>

            {/* ПОЛ */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Пол</label>
              <div className="flex gap-4">
                <button onClick={() => setGender('M')}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition ${
                    gender === 'M' ? 'border-accent bg-accent/10 text-accent' : 'border-border-color bg-surface hover:border-gray-300'
                  }`}
                >Мальчик {gender === 'M' && <Check size={16} />}</button>
                <button onClick={() => setGender('F')}
                  className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition ${
                    gender === 'F' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-border-color bg-surface hover:border-gray-300'
                  }`}
                >Девочка {gender === 'F' && <Check size={16} />}</button>
              </div>
            </div>

            {/* ИМЯ И ДАТА */}
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Кличка / Имя</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Например: Барсик" 
                      className="w-full px-4 py-3 rounded-xl bg-secondary focus:border-primary border border-transparent outline-none transition" />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Дата рождения</label>
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-secondary outline-none border border-transparent focus:border-primary transition" />
               </div>
            </div>

            {/* ПУБЛИЧНОСТЬ */}
            <div className="bg-secondary/50 p-4 rounded-2xl border border-border-color flex items-start gap-3 cursor-pointer" onClick={() => setIsPublic(!isPublic)}>
                <div className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition flex-shrink-0 ${isPublic ? 'bg-primary border-primary' : 'border-gray-400 bg-white'}`}>
                    {isPublic && <Check size={14} className="text-white" />}
                </div>
                <div>
                    <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
                        {isPublic ? <Globe size={16} className="text-accent" /> : <Lock size={16} className="text-gray-500" />}
                        {isPublic ? 'Публичный профиль' : 'Приватный профиль'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {isPublic 
                            ? 'Питомец появится в общей ленте и будет доступен для просмотра всем пользователям.' 
                            : 'Питомца видите только вы и ваши лечащие врачи.'}
                    </p>
                </div>
            </div>

          </div>
        )}

        {/* --- STEP 2 (ДЕТАЛИ) --- */}
        {step === 2 && (
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
             {availableAttributes.map(attr => (
                <div key={attr.id}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{attr.name} {attr.unit && `(${attr.unit})`}</label>
                    <input type="text" 
                        value={attributeValues[attr.slug] || ''} 
                        onChange={(e) => setAttributeValues(prev => ({...prev, [attr.slug]: e.target.value}))}
                        className="w-full px-4 py-2 rounded-xl bg-secondary focus:border-primary border border-transparent outline-none transition text-sm"
                        placeholder="..."
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
                                    isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface border-border-color hover:border-gray-300'
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
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-border-color">
                            <img src={url} className="w-full h-full object-cover" alt="preview" />
                            <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition"><Trash2 size={14} /></button>
                        </div>
                    ))}
                    {files.length < 5 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-secondary transition">
                            <Plus size={24} className="text-gray-400" />
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                        </label>
                    )}
                </div>
            </div>
        )}

        {/* --- STEP 4 (SUCCESS / CREDENTIALS) --- */}
        {step === 4 && createdCredentials && (
            <div className="p-6 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2 animate-bounce">
                    <Check size={32} strokeWidth={3} />
                </div>
                
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Клиент успешно создан</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Передайте эти данные клиенту для входа в приложение.
                    </p>
                    <p className="text-xs text-red-500 mt-1 font-medium">
                        Сохраните их сейчас, они не будут показаны снова!
                    </p>
                </div>

                <div className="w-full bg-secondary/50 rounded-2xl border border-border-color p-4 space-y-4">
                    {/* Логин */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                <UserIcon size={18} />
                            </div>
                            <div className="text-left overflow-hidden">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Логин</p>
                                <p className="text-sm font-bold text-gray-800 truncate">{createdCredentials.login}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => copyToClipboard(createdCredentials.login)} 
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition"
                            title="Скопировать логин"
                        >
                            <Copy size={18} />
                        </button>
                    </div>

                    {/* Пароль */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                                <Key size={18} />
                            </div>
                            <div className="text-left overflow-hidden">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Пароль</p>
                                <p className="text-sm font-bold text-gray-800 font-mono truncate">{createdCredentials.pass}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => copyToClipboard(createdCredentials.pass)} 
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition"
                            title="Скопировать пароль"
                        >
                            <Copy size={18} />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {error && <div className="px-6 pb-2 text-red-500 text-sm animate-pulse">{error}</div>}

        <div className="p-6 border-t border-border-color bg-surface">
            {step === 4 ? (
                // Кнопка закрытия на финальном шаге
                <button 
                    onClick={onClose} 
                    className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition shadow-lg"
                >
                    Закрыть
                </button>
            ) : (
                // Стандартная кнопка "Далее/Готово"
                <button onClick={step < 3 ? handleNextStep : handleSubmit} disabled={isSubmitting}
                   className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg hover:brightness-110 transition disabled:opacity-50 shadow-lg shadow-primary/20">
                   {step < 3 ? 'Далее' : isSubmitting ? 'Создаем...' : 'Готово'}
                </button>
            )}
        </div>

      </div>
    </div>
  );
}