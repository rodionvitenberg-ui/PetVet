'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, FileText, ChevronLeft, ChevronRight, ImageIcon, 
  Calendar, Trash2, Edit2, Plus, Paperclip, User, Stethoscope, PawPrint,
  FileDown
} from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

// === ИМПОРТЫ МОДАЛОК ===
import EditPetModal from '@/components/dashboard/EditPetModal'; 
import UpdateGalleryModal from '@/components/dashboard/UpdateGalleryModal'; 
import CreateEventModal from '@/components/dashboard/CreateEventModal'; 
import UserProfileModal from '@/components/dashboard/UserProfileModal';
import DeletePetModal from '@/components/dashboard/DeletePetModal'; 
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PetPassportDocument } from '@/components/pdf/PetPassportDocument';

import { useTranslations, useLocale } from 'next-intl';

// === ТИПЫ ===
import { PetDetail, UserProfile } from '@/types/pet'; 
import { PetEvent } from '@/types/event'; 

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getMediaUrl = (url: string | undefined | null) => {
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

export default function PetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  
  const t = useTranslations('Passport');
  const locale = useLocale();

  const petId = Number(params?.id);

  const [pet, setPet] = useState<PetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'medical'>('info');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false); 
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); 
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [editingEvent, setEditingEvent] = useState<PetEvent | null>(null);

  const [isClient, setIsClient] = useState(false);
  
  // === ЛОГИКА СВАЙПА (Touch/Mouse) ===
  const [swipeStart, setSwipeStart] = useState<number | null>(null);

  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      setSwipeStart(x);
  };

  const handleSwipeEnd = (e: React.TouchEvent | React.MouseEvent) => {
      if (swipeStart === null) return;
      
      const x = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
      const diff = swipeStart - x;
      const threshold = 50; 

      if (diff > threshold) nextImage(); // Влево -> След
      else if (diff < -threshold) prevImage(); // Вправо -> Пред
      
      setSwipeStart(null);
  };
  // ====================================

  useEffect(() => {
      setIsClient(true);
  }, []);

  const fetchPetData = () => {
      if (!petId) return;
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      fetch(`${API_URL}/api/pets/${petId}/`, {
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
      })
      .then(res => {
          if (res.status === 404) {
             router.push('/dashboard');
             return null;
          }
          if (!res.ok) throw new Error(res.statusText);
          return res.json();
      })
      .then(data => {
          if (data) {
              setPet(data);
              setCurrentImageIndex(0);
          }
      })
      .catch(err => console.error("Ошибка загрузки:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
      fetchPetData();
  }, [petId]);

  useEffect(() => {
      const tab = searchParams.get('tab');
      if (tab === 'medical') {
          setActiveTab('medical');
      }
  }, [searchParams]);

  const handleDeleteClick = () => {
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (!pet) return;
      setIsDeleting(true);
      try {
          const token = localStorage.getItem('access_token');
          await fetch(`${API_URL}/api/pets/${pet.id}/`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          });
          router.push('/dashboard');
          router.refresh();
      } catch (error) {
          alert("Ошибка удаления.");
      } finally {
          setIsDeleting(false);
      }
  };

  const handleParentClick = (parentId: number) => {
      router.push(`/pets/${parentId}`);
  };

  const openCreateEvent = () => {
      setEditingEvent(null); 
      setIsEventModalOpen(true);
  };

  const openEditEvent = (event: PetEvent) => {
      setEditingEvent(event); 
      setIsEventModalOpen(true);
  };

  const allImages = pet?.images?.map(img => img.image) || [];
  
  const nextImage = () => {
      if (allImages.length === 0) return;
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };
  
  const prevImage = () => {
       if (allImages.length === 0) return;
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const canDelete = currentUser && pet && (Number(currentUser.id) === Number(pet.owner) || Number(currentUser.id) === Number(pet.created_by));

  if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
             <Activity className="w-10 h-10 text-blue-500 animate-spin mb-4" />
             <p className="text-gray-400 font-medium">Загружаем профиль...</p>
        </div>
      );
  }

  if (!pet) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-20 lg:pt-24">
        {/* МОДАЛКИ */}
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
                images={pet.images || []} 
                onSuccess={fetchPetData} 
            />
            <CreateEventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                petId={pet.id}
                onSuccess={fetchPetData}
                initialData={editingEvent} 
            />
            <DeletePetModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                petName={pet.name}
                isDeleting={isDeleting}
            />
             <UserProfileModal 
                 isOpen={!!selectedUserProfile}
                 onClose={() => setSelectedUserProfile(null)}
                 user={selectedUserProfile}
             />
        </>

        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-none sm:rounded-[2rem] overflow-hidden min-h-[calc(100vh-6rem)] flex flex-col">
            
            {/* ХЕДЕР СТРАНИЦЫ (СВАЙП) */}
            <div 
                className="relative h-72 sm:h-96 bg-gray-900 shrink-0 group cursor-grab active:cursor-grabbing select-none touch-pan-y"
                onTouchStart={handleSwipeStart}
                onTouchEnd={handleSwipeEnd}
                onMouseDown={handleSwipeStart}
                onMouseUp={handleSwipeEnd}
                onMouseLeave={() => setSwipeStart(null)}
            >
                {allImages.length > 0 ? (
                    <>
                        <div 
                            className="absolute inset-0 opacity-30 blur-xl scale-110 pointer-events-none"
                            style={{ backgroundImage: `url(${getMediaUrl(allImages[currentImageIndex])})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                        <img 
                            key={currentImageIndex}
                            src={getMediaUrl(allImages[currentImageIndex]) || ''} 
                            alt={pet.name} 
                            draggable={false}
                            className="relative w-full h-full object-cover z-10 transition-all duration-300 pointer-events-none" 
                        />
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 z-10 relative bg-gray-100 pointer-events-none">
                        <ImageIcon size={64} opacity={0.3} />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-20 pointer-events-none" />

                {/* КНОПКА НАЗАД (С pointer-events-auto и z-50) */}
                <button 
                    onClick={() => router.back()}
                    className="absolute top-4 left-4 px-4 py-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md z-50 transition flex items-center gap-2 text-sm font-bold border border-white/10 pointer-events-auto"
                >
                    <ChevronLeft size={18} /> Назад
                </button>

                {/* КНОПКА ЗАКРЫТЬ УБРАНА! */}

                {allImages.length > 1 && (
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 pointer-events-none">
                        {allImages.map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
                        ))}
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-30 pointer-events-none">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
                                {pet.name}
                                {pet.gender === 'F' 
                                    ? <span className="w-8 h-8 rounded-full bg-pink-500/80 flex items-center justify-center text-white text-sm border border-white/20">♀</span> 
                                    : <span className="w-8 h-8 rounded-full bg-blue-500/80 flex items-center justify-center text-white text-sm border border-white/20">♂</span>
                                }
                            </h1>
                            
                            {pet.owner_info && currentUser?.id !== pet.owner_info.id && (
                                <div 
                                onClick={(e) => { e.stopPropagation(); setSelectedUserProfile(pet?.owner_info as UserProfile); }}
                                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-md cursor-pointer transition-colors border border-white/10 mb-3 pointer-events-auto"
                                >
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                                    {pet.owner_info.avatar ? (
                                        <img src={getMediaUrl(pet.owner_info.avatar)!} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={14} className="text-white" />
                                    )}
                                </div>
                                <span className="text-white text-sm font-medium">Владелец: {pet.owner_info.name}</span>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm font-medium">
                                {pet.breed && (
                                    <span className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10 flex items-center gap-2">
                                        <PawPrint size={16} className="opacity-80"/>
                                        {pet.breed}
                                    </span>
                                )}
                                
                                <span className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">{pet.age || 'Возраст скрыт'}</span>
                                <span className="flex items-center gap-1.5 opacity-90 bg-black/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                                    <Calendar size={16} />
                                    {pet.birth_date ? new Date(pet.birth_date).toLocaleDateString('ru-RU') : 'Дата скрыта'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ТАБЫ */}
            <div className="flex border-b border-gray-100 bg-white z-20 sticky top-16 lg:top-0">
                <button 
                    onClick={() => setActiveTab('info')} 
                    className={`flex-1 py-4 font-bold text-sm uppercase tracking-wide transition-all relative ${activeTab === 'info' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                >
                    Анкета
                    {activeTab === 'info' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
                </button>
                <button 
                    onClick={() => setActiveTab('medical')} 
                    className={`flex-1 py-4 font-bold text-sm uppercase tracking-wide transition-all relative ${activeTab === 'medical' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                >
                    Медкарта
                    {activeTab === 'medical' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
                </button>
            </div>

            {/* КОНТЕНТ */}
            <div className="flex-1 bg-white p-4 sm:p-8">
                <div className="max-w-2xl mx-auto space-y-8">
                    
                    {/* ВКЛАДКА: АНКЕТА */}
                    {activeTab === 'info' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            
                            {pet.tags && pet.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {pet.tags.map((tag, index) => (
                                        <span 
                                            key={tag.id || index}
                                            className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-gray-700 flex items-center gap-2 border border-gray-200 shadow-sm"
                                        >
                                            {tag.icon && <img src={getMediaUrl(tag.icon)!} className="w-5 h-5 object-contain" alt="" />}
                                            {tag.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                             {pet.description && (
                                <div className="bg-gray-50 p-6 rounded-2xl text-base text-gray-700 leading-relaxed border border-gray-100 relative">
                                    <div className="absolute -top-3 left-6 bg-gray-50 px-2 text-xs font-bold text-gray-400">О питомце</div>
                                    {pet.description}
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FileText size={18} className="text-blue-500" /> Характеристики
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                                <div className="pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Родители</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {pet.mother_info ? (
                                            <div 
                                                onClick={() => handleParentClick(pet.mother_info!.id)}
                                                className="flex items-center gap-4 p-4 bg-gradient-to-br from-pink-50 to-white hover:to-pink-50 rounded-2xl border border-pink-100 cursor-pointer transition-all hover:shadow-md group"
                                            >
                                                <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center shrink-0 border-2 border-pink-200 overflow-hidden">
                                                     {pet.mother_info.image ? (
                                                         <img src={getMediaUrl(pet.mother_info.image)!} className="w-full h-full object-cover" alt="" />
                                                     ) : (
                                                         <span className="text-pink-500 font-bold text-xl">♀</span>
                                                     )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs text-pink-400 font-bold uppercase mb-1">Мама</p>
                                                    <p className="font-bold text-gray-800 text-lg truncate group-hover:text-pink-700 transition-colors">
                                                        {pet.mother_info.name}
                                                    </p>
                                                </div>
                                                <ChevronRight className="ml-auto text-pink-200 group-hover:text-pink-400" />
                                            </div>
                                        ) : (
                                            <div className="p-4 text-sm text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center">Мама не указана</div>
                                        )}
                                        
                                        {pet.father_info ? (
                                            <div 
                                                onClick={() => handleParentClick(pet.father_info!.id)}
                                                className="flex items-center gap-4 p-4 bg-gradient-to-br from-blue-50 to-white hover:to-blue-50 rounded-2xl border border-blue-100 cursor-pointer transition-all hover:shadow-md group"
                                            >
                                                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border-2 border-blue-200 overflow-hidden">
                                                    {pet.father_info.image ? (
                                                         <img src={getMediaUrl(pet.father_info.image)!} className="w-full h-full object-cover" alt="" />
                                                     ) : (
                                                         <span className="text-blue-500 font-bold text-xl">♂</span>
                                                     )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs text-blue-400 font-bold uppercase mb-1">Папа</p>
                                                    <p className="font-bold text-gray-800 text-lg truncate group-hover:text-blue-700 transition-colors">
                                                        {pet.father_info.name}
                                                    </p>
                                                </div>
                                                <ChevronRight className="ml-auto text-blue-200 group-hover:text-blue-400" />
                                            </div>
                                        ) : (
                                            <div className="p-4 text-sm text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center">Папа не указан</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* КНОПКИ ДЕЙСТВИЙ */}
                            <div className="pt-8 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button onClick={() => setIsGalleryOpen(true)} className="py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2">
                                    <ImageIcon size={18} /> Галерея
                                </button>
                                <button onClick={() => router.push(`/pets/${pet.id}/edit`)} className="py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2">
                                    <Edit2 size={18} /> Редактировать
                                </button>
                                
                                {isClient && pet && (
                                  <PDFDownloadLink
                                     document={<PetPassportDocument pet={pet} t={t} locale={locale} />}
                                     fileName={`Passport_${pet.name}.pdf`}
                                     className="sm:col-span-2 w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                                     >
                                     {({ loading }) => (
                                     loading 
                                     ? 'Генерация документа...' 
                                     : <><FileDown size={18} /> СКАЧАТЬ PDF-ПАСПОРТ ({locale.toUpperCase()})</>
                                     )}
                                  </PDFDownloadLink>
                                )}

                                {canDelete && (
                                    <button onClick={handleDeleteClick} className="sm:col-span-2 py-3 px-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2 mt-2">
                                        <Trash2 size={18} /> Удалить профиль
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ВКЛАДКА: МЕДКАРТА */}
                    {activeTab === 'medical' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Прикрепление</h3>

                                {pet.active_vets && pet.active_vets.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {pet.active_vets.map(vet => (
                                            <div 
                                                key={vet.id}
                                                onClick={() => setSelectedUserProfile(vet)}
                                                className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4 cursor-pointer hover:bg-emerald-100 hover:shadow-md transition-all group"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                                                    {vet.avatar ? (
                                                        <img src={getMediaUrl(vet.avatar)!} className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <Stethoscope size={20} />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] uppercase font-bold text-emerald-600/70 tracking-wider">Лечащий врач</p>
                                                    <p className="font-bold text-gray-900 text-base">{vet.name}</p>
                                                    {vet.clinic_name && <p className="text-xs text-gray-500">{vet.clinic_name}</p>}
                                                </div>
                                                <ChevronRight className="text-emerald-300 group-hover:text-emerald-500" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 text-gray-500 text-sm flex items-center gap-3">
                                        <Activity className="text-gray-400" size={20} />
                                        Питомец пока не прикреплен к клинике
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">История событий</h3>
                                    <button 
                                        onClick={openCreateEvent}
                                        className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                                    >
                                        <Plus size={18} />
                                        Добавить
                                    </button>
                                </div>

                                {(!pet.recent_events || pet.recent_events.length === 0) ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-900 font-bold text-lg">Пока нет записей</p>
                                        <p className="text-gray-500 text-sm mt-1">Добавьте первую запись о здоровье</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pet.recent_events?.map((event) => (
                                            <div key={event.id} className="group relative flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                                                
                                                <button 
                                                    onClick={() => openEditEvent(event)}
                                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                                    title="Редактировать запись"
                                                >
                                                    <Edit2 size={16} />
                                                </button>

                                                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${
                                                    event.status === 'completed' ? 'bg-white border-green-200 text-green-600' :
                                                    event.status === 'planned' ? 'bg-white border-blue-200 text-blue-500' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {event.event_type?.icon ? (
                                                        <img src={getMediaUrl(event.event_type.icon)!} className="w-6 h-6 object-contain" />
                                                    ) : (
                                                        <Activity size={24} />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0 pr-8">
                                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900 text-lg leading-tight">
                                                                {event.title}
                                                            </h4>
                                                            
                                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1.5 font-medium items-center">
                                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{event.event_type?.name}</span>
                                                                
                                                                {event.created_by_info && (
                                                                    <>
                                                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                                        <span className="flex items-center gap-1">
                                                                            {event.created_by_info.is_vet ? (
                                                                                <>
                                                                                    <Stethoscope size={12} className="text-blue-500" />
                                                                                    <span className="text-blue-600 font-bold">
                                                                                        {event.created_by_info.clinic_name || 'Врач'}
                                                                                    </span>
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
                                                        <div className="text-left sm:text-right mt-2 sm:mt-0 shrink-0">
                                                            <p className="text-sm font-bold text-gray-900">
                                                                {formatDateTime(event.date)}
                                                            </p>
                                                            {event.next_date && (
                                                                <p className="text-xs text-blue-600 font-bold mt-0.5">
                                                                    → {new Date(event.next_date).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {event.description && (
                                                        <p className="text-sm text-gray-600 mt-3 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                            {event.description}
                                                        </p>
                                                    )}

                                                    {event.attachments && event.attachments.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-4">
                                                            {event.attachments?.map(att => (
                                                                <a 
                                                                    key={att.id} 
                                                                    href={getMediaUrl(att.file)!} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition"
                                                                >
                                                                    <Paperclip size={14} />
                                                                    Файл
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
  );
}