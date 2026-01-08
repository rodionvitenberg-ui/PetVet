'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Activity, FileText, ChevronLeft, ChevronRight, ImageIcon, Calendar, Trash2, Edit2, Plus, Paperclip, User, Stethoscope
} from 'lucide-react';
import EditPetModal from './EditPetModal'; 
import UpdateGalleryModal from './UpdateGalleryModal'; 
import CreateHealthEventModal from './CreateHealthEventModal'; 

// === ИНТЕРФЕЙСЫ ===

interface AttributeType {
    name: string;
    slug: string;
    icon: string | null;
}

interface PetAttribute {
  attribute: AttributeType;
  value: string;
}

interface PetTag {
    id: number;
    slug: string;
    name: string;
    icon: string | null;
}

interface ParentInfo {
    id: number;
    name: string;
    gender: 'M' | 'F';
    image?: string | null;
}

interface HealthStatus {
    status: 'healthy' | 'sick' | 'attention';
    label: string;
    color: string;
}

// Интерфейс вложения
interface HealthEventAttachment {
    id: number;
    file: string; // URL файла
    created_at: string;
}

// Интерфейс события
interface HealthEvent {
    id: number;
    title: string;
    event_type: string; // technical name (vaccine)
    event_type_display: string; // readable (Вакцинация)
    date: string; // ISO String "2025-12-15 14:30"
    next_date?: string;
    description?: string;
    status: string;
    status_display: string;
    created_by_name?: string;
    created_by_clinic?: string;
    created_by_is_vet?: boolean;
    attachments: HealthEventAttachment[];
}

interface PetDetail {
  id: number;
  name: string;
  gender: 'M' | 'F';
  birth_date?: string;
  age?: string;
  images: { id: number; image: string; is_main: boolean }[];
  attributes: PetAttribute[];
  tags: PetTag[];
  clinic_name?: string;
  description?: string;
  is_public: boolean;
  is_active?: boolean;
  owner_id: number;
  categories?: any[];
  
  mother_info?: ParentInfo;
  father_info?: ParentInfo;
  health_status?: HealthStatus;
  recent_events?: HealthEvent[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getMediaUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
};

const formatDateTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export default function PetDetailsModal({ petId, isOpen, onClose }: { petId: number | null, isOpen: boolean, onClose: () => void }) {
  const [pet, setPet] = useState<PetDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'medical'>('info');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  
  // === [NEW] Событие, которое редактируем ===
  const [editingEvent, setEditingEvent] = useState<HealthEvent | null>(null);
  
  const [displayPetId, setDisplayPetId] = useState<number | null>(null);

  useEffect(() => {
      if (isOpen && petId) {
          setDisplayPetId(petId);
      }
  }, [isOpen, petId]);

  const fetchPetData = () => {
      if (!displayPetId) return;
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      fetch(`/api/pets/${displayPetId}/`, {
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
      })
      .then(res => {
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
      })
      .then(data => {
          setPet(data);
          setCurrentImageIndex(0);
      })
      .catch(err => console.error("Ошибка загрузки:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && displayPetId) {
      setPet(null);
      fetchPetData();
    }
  }, [isOpen, displayPetId]); 

  const handleDelete = async () => {
      if (!pet) return;
      const confirmed = window.confirm(`Удалить профиль "${pet.name}"?`);
      if (!confirmed) return;

      setIsDeleting(true);
      try {
          const token = localStorage.getItem('access_token');
          await fetch(`/api/pets/${pet.id}/`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          onClose();
          window.location.reload();
      } catch (error) {
          alert("Ошибка удаления.");
      } finally {
          setIsDeleting(false);
      }
  };

  // === [NEW] Обработчики для редактирования записи ===
  const openCreateHealthEvent = () => {
      setEditingEvent(null); // Сбрасываем (режим создания)
      setIsHealthModalOpen(true);
  };

  const openEditHealthEvent = (event: HealthEvent) => {
      setEditingEvent(event); // Устанавливаем (режим редактирования)
      setIsHealthModalOpen(true);
  };

  if (!isOpen) return null;

  const isLoadingState = loading || !pet;
  const allImages = pet?.images?.map(img => img.image) || [];
  
  const nextImage = () => {
      if (allImages.length === 0) return;
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };
  
  const prevImage = () => {
       if (allImages.length === 0) return;
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const getStatusColor = (color?: string) => {
      if (color === 'red') return 'bg-red-50 text-red-700 border-red-100';
      if (color === 'yellow') return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      return 'bg-green-50 text-green-700 border-green-100';
  };

  const handleParentClick = (id: number) => {
      setDisplayPetId(id);
      setActiveTab('info');
  };

  return (
    <>
        {pet && (
            <>
                <EditPetModal 
                    isOpen={isEditOpen} 
                    onClose={() => setIsEditOpen(false)}
                    pet={pet}
                    onSuccess={fetchPetData} 
                />
                <UpdateGalleryModal 
                    isOpen={isGalleryOpen} 
                    onClose={() => setIsGalleryOpen(false)}
                    petId={pet.id}
                    images={pet.images}
                    onSuccess={fetchPetData} 
                />
                <CreateHealthEventModal
                    isOpen={isHealthModalOpen}
                    onClose={() => setIsHealthModalOpen(false)}
                    petId={pet.id}
                    onSuccess={fetchPetData}
                    initialData={editingEvent} // Передаем событие на редактирование
                />
            </>
        )}

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

          <div className="relative bg-white w-full max-w-2xl h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            
            {/* ЛОАДЕР */}
            {isLoadingState && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white">
                    <div className="flex flex-col items-center gap-3">
                        <Activity className="w-10 h-10 text-blue-500 animate-spin" />
                        <p className="text-gray-400 font-medium">Загружаем анкету...</p>
                    </div>
                </div>
            )}

            {/* ХЕДЕР */}
            <div className="relative h-64 bg-gray-900 shrink-0 group">
                {allImages.length > 0 ? (
                    <>
                        <div 
                            className="absolute inset-0 opacity-30 blur-xl scale-110"
                            style={{ backgroundImage: `url(${getMediaUrl(allImages[currentImageIndex])})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                        <img 
                            src={getMediaUrl(allImages[currentImageIndex]) || ''} 
                            alt={pet?.name} 
                            className="relative w-full h-full object-cover z-10 transition-all duration-300" 
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 z-10 relative">
                        <ImageIcon size={48} opacity={0.5} />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20 pointer-events-none" />

                {petId !== displayPetId && (
                     <button 
                        onClick={() => setDisplayPetId(petId)}
                        className="absolute top-4 left-4 px-3 py-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md z-40 transition flex items-center gap-2 text-sm font-bold"
                     >
                        <ChevronLeft size={16} /> Назад
                     </button>
                )}

                {allImages.length > 1 && (
                    <div className="absolute inset-0 z-30 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md transition">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                )}
                
                {allImages.length > 1 && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                        {allImages.map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/50'}`} />
                        ))}
                    </div>
                )}

                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md z-40 transition">
                    <X size={20} />
                </button>
                
                <div className="absolute bottom-0 left-0 right-0 p-6 z-30">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        {pet?.name}
                        {pet?.gender === 'F' 
                            ? <span className="w-6 h-6 rounded-full bg-pink-500/80 flex items-center justify-center text-white text-xs border border-white/20">♀</span> 
                            : <span className="w-6 h-6 rounded-full bg-blue-500/80 flex items-center justify-center text-white text-xs border border-white/20">♂</span>
                        }
                    </h2>
                    <div className="flex items-center gap-3 text-white/90 text-sm mt-1 font-medium">
                        <span className="bg-white/10 px-2 py-0.5 rounded backdrop-blur-sm">{pet?.age || 'Возраст скрыт'}</span>
                        <span className="flex items-center gap-1 opacity-80">
                            <Calendar size={14} />
                            {pet?.birth_date ? new Date(pet.birth_date).toLocaleDateString('ru-RU') : 'Дата скрыта'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ТАБЫ */}
            <div className="flex border-b border-gray-100 bg-white z-10 shrink-0">
                <button 
                    onClick={() => setActiveTab('info')} 
                    className={`flex-1 py-4 font-bold text-sm transition-all relative ${activeTab === 'info' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Анкета
                    {activeTab === 'info' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900" />}
                </button>
                <button 
                    onClick={() => setActiveTab('medical')} 
                    className={`flex-1 py-4 font-bold text-sm transition-all relative ${activeTab === 'medical' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Медкарта
                    {activeTab === 'medical' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900" />}
                </button>
            </div>

            {/* КОНТЕНТ */}
            <div className="flex-1 overflow-y-auto bg-white p-6 custom-scrollbar">
                <div className="max-w-xl mx-auto space-y-8">
                    
                    {pet && activeTab === 'info' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* ТЕГИ */}
                            {pet.tags && pet.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {pet.tags.map((tag, index) => (
                                        <span 
                                            key={tag.id || index}
                                            className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-2 border border-gray-100 shadow-sm"
                                        >
                                            {tag.icon && <img src={getMediaUrl(tag.icon)!} className="w-4 h-4 object-contain" alt="" />}
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                             {pet.description && (
                                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed border border-gray-100">
                                    {pet.description}
                                </div>
                            )}

                            {/* АТРИБУТЫ */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Характеристики</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <InfoCard 
                                        icon={<Activity className="text-red-500" size={18} />} 
                                        label="Клиника" 
                                        value={pet.clinic_name || 'Не прикреплен'} 
                                    />
                                    {pet.attributes?.map((attr, idx) => (
                                        <InfoCard 
                                            key={idx}
                                            icon={
                                                attr.attribute.icon 
                                                ? <img src={getMediaUrl(attr.attribute.icon)!} className="w-5 h-5 object-contain" alt="" /> 
                                                : <FileText size={18} className="text-gray-400" />
                                            } 
                                            label={attr.attribute.name} 
                                            value={attr.value} 
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* РОДИТЕЛИ */}
                            {(pet.mother_info || pet.father_info) && (
                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Родители</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {pet.mother_info ? (
                                            <div 
                                                onClick={() => handleParentClick(pet.mother_info!.id)}
                                                className="flex items-center gap-3 p-3 bg-pink-50/50 hover:bg-pink-50 rounded-2xl border border-pink-100 cursor-pointer transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center shrink-0 border border-pink-200 overflow-hidden">
                                                     {pet.mother_info.image ? (
                                                         <img src={getMediaUrl(pet.mother_info.image)!} className="w-full h-full object-cover" alt="" />
                                                     ) : (
                                                         <span className="text-pink-500 font-bold text-lg">♀</span>
                                                     )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] text-pink-400 font-bold uppercase truncate">Мама</p>
                                                    <p className="font-bold text-gray-800 text-sm truncate group-hover:text-pink-700 transition-colors">
                                                        {pet.mother_info.name}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Мама не указана</div>
                                        )}
                                        
                                        {pet.father_info ? (
                                            <div 
                                                onClick={() => handleParentClick(pet.father_info!.id)}
                                                className="flex items-center gap-3 p-3 bg-blue-50/50 hover:bg-blue-50 rounded-2xl border border-blue-100 cursor-pointer transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200 overflow-hidden">
                                                    {pet.father_info.image ? (
                                                         <img src={getMediaUrl(pet.father_info.image)!} className="w-full h-full object-cover" alt="" />
                                                     ) : (
                                                         <span className="text-blue-500 font-bold text-lg">♂</span>
                                                     )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] text-blue-400 font-bold uppercase truncate">Папа</p>
                                                    <p className="font-bold text-gray-800 text-sm truncate group-hover:text-blue-700 transition-colors">
                                                        {pet.father_info.name}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">Папа не указан</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* КНОПКИ ДЕЙСТВИЙ */}
                            <div className="pt-8 mt-8 border-t border-gray-100 space-y-3">
                                <button onClick={() => setIsGalleryOpen(true)} className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                    <ImageIcon size={18} /> ОБНОВИТЬ ГАЛЕРЕЮ
                                </button>
                                <button onClick={() => setIsEditOpen(true)} className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                                    <Edit2 size={18} /> РЕДАКТИРОВАТЬ ПРОФИЛЬ
                                </button>
                                <button onClick={handleDelete} disabled={isDeleting} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                                    {isDeleting ? "Удаление..." : <><Trash2 size={18} /> УДАЛИТЬ ПРОФИЛЬ ПИТОМЦА</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {pet && activeTab === 'medical' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                             
                             <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Прикрепление</h3>
                                <InfoCard 
                                    icon={<Activity className="text-red-500" size={18} />} 
                                    label="Ветеринарная клиника" 
                                    value={pet.clinic_name || 'Не прикреплен'} 
                                />
                             </div>

                             <div className={`p-4 rounded-xl border flex items-start gap-3 ${getStatusColor(pet.health_status?.color)}`}>
                                 <div className="mt-0.5 shrink-0"><Activity size={20} /></div>
                                 <div>
                                     <h4 className="font-bold text-sm">{pet.health_status?.label || 'Статус не определен'}</h4>
                                     <p className="text-xs opacity-80 mt-1 leading-relaxed">
                                         Данные на основе последнего осмотра.
                                     </p>
                                 </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">История событий</h3>
                                    {/* [UPDATED] Открывает модалку в режиме создания */}
                                    <button 
                                        onClick={openCreateHealthEvent}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <Plus size={14} />
                                        Добавить запись
                                    </button>
                                </div>

                                {(!pet.recent_events || pet.recent_events.length === 0) ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <FileText className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 font-medium text-sm">Нет записей</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {pet.recent_events?.map((event) => (
                                            <div key={event.id} className="group relative flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all">
                                                
                                                {/* [UPDATED] Кнопка редактирования (вызывает openEditHealthEvent) */}
                                                <button 
                                                    onClick={() => openEditHealthEvent(event)}
                                                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                                    title="Редактировать запись"
                                                >
                                                    <Edit2 size={14} />
                                                </button>

                                                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                                    event.status === 'completed' ? 'bg-green-100 text-green-600' :
                                                    event.status === 'planned' ? 'bg-blue-50 text-blue-500' :
                                                    'bg-gray-200 text-gray-500'
                                                }`}>
                                                    <Activity size={18} />
                                                </div>

                                                <div className="flex-1 min-w-0 pr-6">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 truncate pr-2 text-sm">
                                                                {event.title || event.event_type_display}
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1 font-medium items-center">
                                                                <span>{event.event_type_display}</span>
                                                                {event.created_by_name && (
                                                                    <>
                                                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                                        <span className="flex items-center gap-1">
                                                                            {event.created_by_is_vet ? (
                                                                                <>
                                                                                    <Stethoscope size={12} className="text-blue-500" />
                                                                                    <span className="text-blue-600 font-bold">{event.created_by_clinic || 'Врач'}</span>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <User size={12} />
                                                                                    <span>Владелец</span>
                                                                                </>
                                                                            )}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-xs font-bold text-gray-900">
                                                                {formatDateTime(event.date)}
                                                            </p>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block ${
                                                                event.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                event.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-200 text-gray-600'
                                                            }`}>
                                                                {event.status_display}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    {event.description && (
                                                        <p className="text-xs text-gray-600 mt-2 line-clamp-2 bg-white/60 p-2 rounded-lg">
                                                            {event.description}
                                                        </p>
                                                    )}

                                                    {/* Вложения */}
                                                    {event.attachments && event.attachments.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-100/50">
                                                            {event.attachments.map(att => (
                                                                <a 
                                                                    key={att.id} 
                                                                    href={getMediaUrl(att.file)!} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md text-[10px] font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition"
                                                                >
                                                                    <Paperclip size={12} />
                                                                    Файл {att.id}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
    </>
  );
}

const InfoCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3 hover:border-blue-100 transition-colors">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden p-2 text-gray-600">
            {icon}
        </div>
        <div className="overflow-hidden">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider truncate mb-0.5">{label}</p>
            <p className="font-bold text-gray-900 truncate text-sm">{value}</p>
        </div>
    </div>
);