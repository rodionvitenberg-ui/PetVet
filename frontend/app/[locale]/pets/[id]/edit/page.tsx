'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Check, ArrowLeft, Plus, Trash2, 
  HelpCircle, Globe, Lock, MoreHorizontal
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Типы
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

export default function EditPetPage() {
  const router = useRouter();
  const params = useParams();
  const petId = params?.id;

  // === STATES ===
  const [step, setStep] = useState<1 | 2>(1); // Тут всего 2 шага (без логина/пароля)
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Data Dictionaries
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableAttributes, setAvailableAttributes] = useState<Attribute[]>([]);

  // Form Data
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedBreedId, setSelectedBreedId] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>({});
  
  // Images
  const [existingImages, setExistingImages] = useState<{id: number, image: string, is_main: boolean}[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // === INITIAL LOAD ===
  useEffect(() => {
    if (!petId) return;
    
    const loadData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

      try {
        // 1. Грузим справочники
        const [catsRes, petRes] = await Promise.all([
           fetch(`${API_URL}/api/categories/`),
           fetch(`${API_URL}/api/pets/${petId}/`, { headers })
        ]);

        if (!catsRes.ok || !petRes.ok) throw new Error('Ошибка загрузки данных');

        const catsData = await catsRes.json();
        setCategories(catsData);

        const pet = await petRes.json();

        // 2. Предзаполняем форму
        setName(pet.name);
        setGender(pet.gender);
        setBirthDate(pet.birth_date || '');
        setDescription(pet.description || '');
        setIsPublic(pet.is_public);
        setExistingImages(pet.images || []);

        // Категории
        const parentCat = pet.categories.find((c: any) => !c.parent);
        const childCat = pet.categories.find((c: any) => c.parent);
        
        if (parentCat) {
            setSelectedCategoryId(parentCat.id);
            // Грузим теги и атрибуты для этой категории
            await fetchCategoryDetails(parentCat.id);
        }
        if (childCat) setSelectedBreedId(childCat.id);

        // Атрибуты и теги (после того как загрузили справочники)
        // Тут хитрость: нам нужно дождаться fetchCategoryDetails, поэтому логика вынесена
        const attrVals: Record<string, string> = {};
        pet.attributes?.forEach((pa: any) => { attrVals[pa.attribute.slug] = pa.value; });
        setAttributeValues(attrVals);

        // Теги придется маппить по slug, т.к. IDs могут не совпадать если не загружены
        // Но fetchCategoryDetails загрузит availableTags
        // Сделаем это внутри fetchCategoryDetails или отдельным эффектом

      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить профиль');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  // Дополнительный эффект для установки ID тегов после загрузки словаря тегов
  useEffect(() => {
    if (availableTags.length > 0 && petId) {
        // Тут мы "догоняем" теги. В идеале это делать сразу, но API возвращает объекты тегов в питомце
        // Получим питомца еще раз или сохраним его в стейт (лучше оптимизировать, но пока так)
        const token = localStorage.getItem('access_token');
        fetch(`${API_URL}/api/pets/${petId}/`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => res.json())
            .then(pet => {
                const tagIds = pet.tags?.map((pt: any) => {
                   const found = availableTags.find(at => at.slug === pt.slug);
                   return found ? found.id : null;
                }).filter(Boolean) || [];
                setSelectedTagIds(tagIds);
            });
    }
  }, [availableTags, petId]);

  useEffect(() => {
    return () => previewUrls.forEach(url => URL.revokeObjectURL(url));
  }, [previewUrls]);

  // === HELPERS ===
  const fetchCategoryDetails = async (categoryId: number) => {
    try {
      const [tagsRes, attrsRes] = await Promise.all([
        fetch(`${API_URL}/api/categories/${categoryId}/tags/`),
        fetch(`${API_URL}/api/categories/${categoryId}/attributes/`)
      ]);
      if (tagsRes.ok) setAvailableTags(await tagsRes.json());
      if (attrsRes.ok) setAvailableAttributes(await attrsRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCategory = async (id: number) => {
    if (selectedCategoryId !== id) {
        setSelectedBreedId(null);
        setSelectedCategoryId(id);
        await fetchCategoryDetails(id); // Подгружаем новые параметры
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const totalImages = existingImages.length + newFiles.length + files.length;
      if (totalImages > 5) {
        setError('Максимум 5 фотографий');
        return;
      }
      setNewFiles(prev => [...prev, ...files]);
      setPreviewUrls(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previewUrls[index]);
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const deleteExistingImage = async (imageId: number) => {
      if (!confirm('Удалить фото?')) return;
      const token = localStorage.getItem('access_token');
      try {
          // Предполагаем, что есть эндпоинт для удаления фото или PATCH питомца
          // Если API требует отдельного удаления:
          await fetch(`${API_URL}/api/pet-images/${imageId}/`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          setExistingImages(prev => prev.filter(img => img.id !== imageId));
      } catch (err) {
          console.error(err);
          alert('Ошибка удаления фото');
      }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    const token = localStorage.getItem('access_token');

    try {
      // 1. Формируем JSON
      const categoriesToSend = [];
      if (selectedCategoryId) categoriesToSend.push(selectedCategoryId);
      if (selectedBreedId) categoriesToSend.push(selectedBreedId);

      const attributesPayload = Object.entries(attributeValues)
        .filter(([_, value]) => value && value.trim() !== '')
        .map(([slug, value]) => ({ attribute_slug: slug, value: value }));

      const selectedTagSlugs = availableTags
        .filter(t => selectedTagIds.includes(t.id))
        .map(t => t.slug);

      const payload = {
        name,
        gender,
        birth_date: birthDate || null,
        description,
        is_public: isPublic,
        categories: categoriesToSend,
        tags: selectedTagSlugs,
        attributes: attributesPayload,
      };

      const res = await fetch(`${API_URL}/api/pets/${petId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Ошибка сохранения');

      // 2. Загружаем НОВЫЕ фото
      if (newFiles.length > 0) {
        for (const file of newFiles) {
            const formData = new FormData();
            formData.append('image', file);
            await fetch(`${API_URL}/api/pets/${petId}/upload_image/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
        }
      }

      router.push(`/pets/${petId}`); // Возвращаемся в профиль
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  const getMediaUrl = (url: string) => url.startsWith('http') ? url : `${API_URL}${url}`;

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-6">
            <button 
                onClick={() => router.back()}
                className="p-2 bg-white hover:bg-gray-100 rounded-full transition text-gray-600 shadow-sm border border-gray-200"
            >
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Редактирование</h1>
                <p className="text-sm text-gray-500">Профиль {name}</p>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-6 sm:p-8 space-y-8">
            
            {/* --- BASIC INFO --- */}
            <div className="space-y-6">
                
                {/* ИМЯ */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Кличка</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none text-gray-900 transition" 
                    />
                </div>

                {/* ПОЛ И ДАТА */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Пол</label>
                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                             <button onClick={() => setGender('M')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${gender === 'M' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>М</button>
                             <button onClick={() => setGender('F')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${gender === 'F' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-500'}`}>Ж</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Дата рождения</label>
                        <input 
                            type="date" 
                            value={birthDate} 
                            onChange={e => setBirthDate(e.target.value)} 
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none text-gray-900 transition" 
                        />
                    </div>
                </div>

                {/* ОПИСАНИЕ */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">О себе</label>
                    <textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-blue-500 outline-none text-gray-900 transition resize-none" 
                    />
                </div>

                {/* ВИД И ПОРОДА */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <MoreHorizontal size={16} className="text-blue-500" /> Вид и Порода
                    </h3>
                    
                    {/* Вид */}
                    <div className="grid grid-cols-3 gap-2">
                        {categories.filter(c => !c.parent).map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => handleSelectCategory(cat.id)}
                                className={`p-2 rounded-xl border text-xs font-bold transition ${
                                    selectedCategoryId === cat.id 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Порода */}
                    {selectedCategoryId && (
                        <select 
                            value={selectedBreedId || ''}
                            onChange={(e) => setSelectedBreedId(Number(e.target.value) || null)}
                            className="w-full p-3 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-blue-500"
                        >
                            <option value="">Другая / Не знаю</option>
                            {categories.filter(c => c.parent === selectedCategoryId).map(breed => (
                                <option key={breed.id} value={breed.id}>{breed.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* АТРИБУТЫ */}
                {availableAttributes.length > 0 && (
                     <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900">Характеристики</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {availableAttributes.map(attr => (
                                <div key={attr.id}>
                                    <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">{attr.name} {attr.unit && `(${attr.unit})`}</label>
                                    <input 
                                        type="text"
                                        value={attributeValues[attr.slug] || ''}
                                        onChange={(e) => setAttributeValues({...attributeValues, [attr.slug]: e.target.value})}
                                        className="w-full p-2 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                     </div>
                )}

                 {/* ТЕГИ */}
                {availableTags.length > 0 && (
                     <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Метки</h3>
                        <div className="flex flex-wrap gap-2">
                            {availableTags.map(tag => {
                                if (tag.target_gender && tag.target_gender !== gender) return null;
                                const isSelected = selectedTagIds.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => setSelectedTagIds(prev => isSelected ? prev.filter(i => i !== tag.id) : [...prev, tag.id])}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                            isSelected ? 'bg-green-500 text-white border-green-600' : 'bg-white border-gray-200 text-gray-600'
                                        }`}
                                    >
                                        {tag.name}
                                    </button>
                                );
                            })}
                        </div>
                     </div>
                )}
                
                {/* ФОТОГРАФИИ */}
                <div>
                     <h3 className="text-sm font-bold text-gray-900 mb-3">Фотографии</h3>
                     <div className="grid grid-cols-3 gap-3">
                         {/* Старые фото */}
                         {existingImages.map(img => (
                             <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group">
                                 <img src={getMediaUrl(img.image)} className="w-full h-full object-cover" alt="" />
                                 <button 
                                    onClick={() => deleteExistingImage(img.id)}
                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition"
                                 >
                                    <Trash2 size={14} />
                                 </button>
                             </div>
                         ))}
                         
                         {/* Новые превью */}
                         {previewUrls.map((url, idx) => (
                             <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-500">
                                 <img src={url} className="w-full h-full object-cover" alt="" />
                                 <button onClick={() => removeNewFile(idx)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md"><Trash2 size={14} /></button>
                             </div>
                         ))}

                         {/* Кнопка добавления */}
                         {(existingImages.length + newFiles.length) < 5 && (
                             <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition text-gray-400 hover:text-blue-500">
                                 <Plus size={24} />
                                 <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                             </label>
                         )}
                     </div>
                </div>

                {/* ПУБЛИЧНОСТЬ */}
                <div onClick={() => setIsPublic(!isPublic)} className={`p-4 rounded-xl border transition cursor-pointer flex items-center gap-3 ${isPublic ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${isPublic ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-400'}`}>
                        {isPublic && <Check size={14} />}
                    </div>
                    <div>
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                             {isPublic ? <Globe size={16} /> : <Lock size={16} />} 
                             {isPublic ? 'Публичный' : 'Приватный'}
                        </span>
                    </div>
                </div>

            </div>
            
            {/* FOOTER */}
            <div className="pt-4 border-t border-gray-100">
                {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70"
                >
                    {isSubmitting ? 'Сохраняем...' : 'Сохранить изменения'}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}