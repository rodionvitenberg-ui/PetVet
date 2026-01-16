import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, HelpCircle, Plus, Trash2, UserPlus, Phone, Globe, Lock, Search, X, ChevronDown 
} from 'lucide-react';
import { Category, PetTag, AttributeType } from '@/types/pet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// === HELPER: КОМПОНЕНТ ПОИСКА ПИТОМЦА ===
interface PetSearchSelectProps {
  label: string;
  gender: 'M' | 'F';
  categoryId: number | null;
  value: number | null; // ID выбранного родителя
  onChange: (id: number | null) => void;
  placeholder?: string;
}

const PetSearchSelect = ({ label, gender, categoryId, value, onChange, placeholder }: PetSearchSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<{id: number, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Поиск питомцев
  useEffect(() => {
    if (!isOpen) return;

    const fetchPets = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const params = new URLSearchParams({
            gender: gender,
            is_active: 'true'
        });
        if (search) params.append('search', search);
        if (categoryId) params.append('category_id', String(categoryId)); 

        const res = await fetch(`${API_URL}/api/pets/?${params.toString()}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (res.ok) {
            const data = await res.json();
            const results = Array.isArray(data) ? data : data.results || [];
            setOptions(results);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchPets, 300);
    return () => clearTimeout(debounce);
  }, [search, isOpen, gender, categoryId]);

  const handleSelect = (pet: {id: number, name: string}) => {
      onChange(pet.id);
      setSelectedName(pet.name);
      setIsOpen(false);
      setSearch(''); // Сброс поиска
  };

  const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setSelectedName('');
      setSearch('');
  };

  // Попытка найти имя в загруженных опциях, если оно еще не установлено
  const displayValue = selectedName || options.find(o => o.id === value)?.name || (value ? `ID: ${value}` : '');

  return (
      <div className="relative" ref={containerRef}>
          <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-between px-3 py-2.5 border rounded-xl bg-white cursor-pointer transition ${
                isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
             <div className="flex items-center gap-2 overflow-hidden">
                <Search size={14} className="text-gray-400 shrink-0" />
                {value ? (
                    <span className="text-sm font-bold text-gray-800 truncate">
                        {displayValue}
                    </span>
                ) : (
                    <span className="text-sm text-gray-400 truncate">{placeholder || "Выбрать..."}</span>
                )}
             </div>
             
             {value ? (
                 <button onClick={handleClear} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500">
                     <X size={14} />
                 </button>
             ) : (
                 <ChevronDown size={14} className="text-gray-400" />
             )}
          </div>

          {/* DROPDOWN */}
          {isOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-2 border-b border-gray-50">
                      <input 
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Поиск по кличке..."
                        className="w-full text-sm outline-none px-2 py-1"
                      />
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {isLoading ? (
                          <div className="p-4 text-center text-xs text-gray-400">Загрузка...</div>
                      ) : options.length > 0 ? (
                          options.map(pet => (
                              <button 
                                key={pet.id} 
                                onClick={() => handleSelect(pet)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 text-gray-700 flex items-center justify-between group"
                              >
                                  <span>{pet.name}</span>
                                  {value === pet.id && <Check size={14} className="text-blue-600"/>}
                              </button>
                          ))
                      ) : (
                          <div className="p-4 text-center text-xs text-gray-400">Ничего не найдено</div>
                      )}
                  </div>
              </div>
          )}
      </div>
  );
};


// === STEP 1: BASIC INFO ===
export const StepBasicInfo = ({ data, onChange, categories, onCategorySelect, mode }: any) => {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4">
      {/* Блок Владельца */}
      {mode === 'create_patient' && (
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
            <UserPlus size={16} />
            Данные владельца
          </div>
          <div className="grid grid-cols-1 gap-3">
            <input 
              type="text"
              placeholder="Имя (например: Анна)"
              value={data.tempOwnerName}
              onChange={e => onChange('tempOwnerName', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-blue-100 focus:border-blue-400 outline-none text-sm transition"
            />
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="tel"
                placeholder="Телефон (обязательно)"
                value={data.tempOwnerPhone}
                onChange={e => onChange('tempOwnerPhone', e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-blue-100 focus:border-blue-400 outline-none text-sm transition font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Выбор Вида */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Вид животного</label>
        <div className="grid grid-cols-3 gap-3">
          {categories.filter((c: any) => !c.parent).map((cat: any) => {
            const isActive = data.selectedCategoryId === cat.id;
            return (
              <button 
                key={cat.id} 
                onClick={() => onCategorySelect(cat.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition active:scale-95 ${
                  isActive 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                    : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className="mb-1 w-8 h-8 flex items-center justify-center">
                   {cat.icon ? <img src={cat.icon} className="w-full h-full object-contain" alt={cat.name}/> : <HelpCircle className="text-gray-400"/>}
                </div>
                <span className="text-xs font-bold capitalize text-center leading-tight">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Выбор Породы */}
      {data.selectedCategoryId && categories.some((c: any) => c.parent === data.selectedCategoryId) && (
        <div className="animate-in fade-in slide-in-from-top-2">
           <label className="block text-sm font-bold text-gray-700 mb-2">Порода</label>
           <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {categories.filter((c: any) => c.parent === data.selectedCategoryId).map((breed: any) => (
                 <button 
                   key={breed.id} 
                   onClick={() => onChange('selectedBreedId', breed.id)}
                   className={`px-3 py-2 text-sm rounded-xl border text-left transition truncate ${
                      data.selectedBreedId === breed.id 
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' 
                      : 'border-gray-200 bg-white hover:border-gray-400 text-gray-700'
                   }`}
                 >
                   {breed.name}
                 </button>
              ))}
              <button onClick={() => onChange('selectedBreedId', null)} className="px-3 py-2 text-sm rounded-xl border border-dashed border-gray-300 text-gray-500">
                 Другая / Не знаю
              </button>
           </div>
        </div>
      )}

      {/* Пол, Имя, Дата */}
      <div className="grid grid-cols-2 gap-4">
         <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Кличка</label>
            <input type="text" value={data.name} onChange={e => onChange('name', e.target.value)} 
                className="w-full px-4 py-3 rounded-xl bg-gray-50 focus:bg-white border border-transparent focus:border-blue-500 outline-none transition" />
         </div>
         <button onClick={() => onChange('gender', 'M')} className={`py-3 rounded-xl border-2 font-medium transition ${data.gender === 'M' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'bg-gray-50 border-transparent'}`}>Мальчик</button>
         <button onClick={() => onChange('gender', 'F')} className={`py-3 rounded-xl border-2 font-medium transition ${data.gender === 'F' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'bg-gray-50 border-transparent'}`}>Девочка</button>
         
         <div className="col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Дата рождения</label>
            <input type="date" value={data.birth_date} onChange={e => onChange('birth_date', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 focus:bg-white border border-transparent focus:border-blue-500 outline-none transition" />
         </div>
      </div>

      {/* Публичность */}
      {mode === 'create_own' && (
         <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-start gap-3 cursor-pointer" onClick={() => onChange('is_public', !data.is_public)}>
             <div className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center transition flex-shrink-0 ${data.is_public ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white'}`}>
                 {data.is_public && <Check size={14} className="text-white" />}
             </div>
             <div>
                 <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
                     {data.is_public ? <Globe size={16} className="text-blue-600" /> : <Lock size={16} className="text-gray-500" />}
                     {data.is_public ? 'Публичный профиль' : 'Приватный профиль'}
                 </div>
                 <p className="text-xs text-gray-500 mt-1">Виден в общей ленте и поиске.</p>
             </div>
         </div>
      )}
    </div>
  );
};

// === STEP 2: DETAILS (ATTRIBUTES, TAGS, PARENTS) ===
interface StepDetailsProps {
  data: any;
  onChange: (field: string, value: any) => void;
  onAttributeChange: (slug: string, value: string) => void;
  onTagToggle: (slug: string) => void;
  
  onCreateTag: (name: string) => void;
  onCreateAttribute: (name: string, unit: string) => void;
  
  attributes: AttributeType[];
  tags: PetTag[];
}

export const StepDetails = ({ 
  data, onAttributeChange, onTagToggle, 
  attributes, tags, 
  onCreateTag, onCreateAttribute,
  onChange 
}: StepDetailsProps) => {
  
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isAddingAttr, setIsAddingAttr] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrUnit, setNewAttrUnit] = useState('');

  const filteredTags = tags.filter(t => !t.target_gender || t.target_gender === data.gender);

  const handleSaveTag = () => {
    if (newTagName.trim()) {
      onCreateTag(newTagName);
      setNewTagName('');
      setIsAddingTag(false);
    }
  };

  const handleSaveAttr = () => {
    if (newAttrName.trim()) {
      onCreateAttribute(newAttrName, newAttrUnit);
      setNewAttrName('');
      setNewAttrUnit('');
      setIsAddingAttr(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4">
       
       {/* 1. Атрибуты */}
       <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Характеристики</h3>
          <div className="space-y-3">
            {attributes.map(attr => (
                <div key={attr.id}>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider flex items-center gap-2">
                        {attr.name} {attr.unit && <span className="text-gray-400 normal-case">({attr.unit})</span>}
                        {attr.is_custom && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 rounded-full normal-case">Custom</span>}
                    </label>
                    <input 
                        type="text"
                        value={data.attributeValues[attr.slug] || ''}
                        onChange={e => onAttributeChange(attr.slug, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 border border-transparent outline-none transition text-sm font-medium"
                        placeholder="—"
                    />
                </div>
            ))}
          </div>
          
          {/* ФОРМА ИЛИ КНОПКА ДОБАВЛЕНИЯ - ВНИЗУ */}
          {isAddingAttr ? (
             <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex gap-2 items-center animate-in fade-in zoom-in-95 mt-2">
                <input autoFocus placeholder="Название" value={newAttrName} onChange={e => setNewAttrName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-xs border border-blue-200 outline-none" />
                <input placeholder="Ед.изм" value={newAttrUnit} onChange={e => setNewAttrUnit(e.target.value)} className="w-16 px-3 py-2 rounded-lg text-xs border border-blue-200 outline-none" />
                <button onClick={handleSaveAttr} className="p-2 bg-blue-600 text-white rounded-lg"><Check size={14}/></button>
                <button onClick={() => setIsAddingAttr(false)} className="p-2 text-gray-500 hover:bg-white rounded-lg"><X size={14}/></button>
             </div>
          ) : (
             <button onClick={() => setIsAddingAttr(true)} className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs font-bold hover:border-blue-400 hover:text-blue-500 transition flex items-center justify-center gap-2 mt-2">
                <Plus size={14} /> Добавить свою характеристику
             </button>
          )}
       </div>

       <hr className="border-gray-100"/>

       {/* 2. Теги */}
       <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Особенности</h3>
          <div className="flex flex-wrap gap-2">
              {filteredTags.map(tag => {
                  const isSelected = data.tagSlugs.includes(tag.slug);
                  return (
                      <button key={tag.id} onClick={() => onTagToggle(tag.slug)}
                        className={`px-4 py-2 rounded-full text-xs font-bold border transition flex items-center gap-1 ${
                            isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 hover:border-gray-400 text-gray-600'
                        }`}>
                        {isSelected && <Check size={12} />} {tag.name}
                      </button>
                  )
              })}
              
              {isAddingTag ? (
                 <div className="flex items-center gap-1 animate-in fade-in zoom-in-95">
                    <input autoFocus value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveTag()} placeholder="Новый тег..." className="w-32 px-3 py-2 rounded-full text-xs border border-blue-300 outline-none" />
                    <button onClick={handleSaveTag} className="p-1.5 bg-blue-600 text-white rounded-full"><Check size={12}/></button>
                    <button onClick={() => setIsAddingTag(false)} className="p-1.5 text-gray-400 hover:text-red-500"><X size={12}/></button>
                 </div>
              ) : (
                 <button onClick={() => setIsAddingTag(true)} className="px-3 py-2 rounded-full text-xs font-bold border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition flex items-center gap-1">
                    <Plus size={12} /> Свой тег
                 </button>
              )}
          </div>
       </div>

       <hr className="border-gray-100"/>

       {/* 3. Родители (РЕАЛИЗОВАНО ЧЕРЕЗ ПОИСК) */}
       <div>
            <div className="flex items-center justify-between mb-3">
                 <h3 className="text-sm font-bold text-gray-700">Родители</h3>
                 <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Опционально</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                   <PetSearchSelect 
                      label="Мать"
                      gender="F"
                      categoryId={data.selectedCategoryId}
                      value={data.motherId}
                      onChange={(id) => onChange('motherId', id)}
                      placeholder="Найти маму..."
                   />
                </div>
                <div>
                   <PetSearchSelect 
                      label="Отец"
                      gender="M"
                      categoryId={data.selectedCategoryId}
                      value={data.fatherId}
                      onChange={(id) => onChange('fatherId', id)}
                      placeholder="Найти папу..."
                   />
                </div>
            </div>
            
            <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
               Поиск работает по базе ваших животных. Родитель должен быть того же вида.
            </p>
       </div>

    </div>
  );
};

// === STEP 3: PHOTOS ===
export const StepPhotos = ({ files, previewUrls, onFileChange, onRemove }: any) => {
    return (
        <div className="p-6 grid grid-cols-3 gap-3 animate-in slide-in-from-right-4">
             {previewUrls.map((url: string, idx: number) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200">
                    <img src={url} className="w-full h-full object-cover" alt="preview" />
                    <button onClick={() => onRemove(idx)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                </div>
             ))}
             {files.length < 5 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition text-gray-400 hover:text-blue-500">
                    <Plus size={24} />
                    <input type="file" accept="image/*" multiple className="hidden" onChange={onFileChange} />
                </label>
             )}
        </div>
    );
};