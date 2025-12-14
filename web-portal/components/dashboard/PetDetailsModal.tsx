'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Activity, FileText, ChevronLeft, ChevronRight, ImageIcon, Heart
} from 'lucide-react';

// === ОБНОВЛЕННЫЕ ИНТЕРФЕЙСЫ ===
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
}

interface HealthStatus {
    status: 'healthy' | 'sick' | 'attention';
    label: string;
    color: string;
}

interface PetDetail {
  id: number;
  name: string;
  gender: 'M' | 'F';
  birth_date?: string;
  age?: string;
  images: { image: string; is_main: boolean }[]; 
  attributes: PetAttribute[];
  tags: PetTag[];
  clinic_name?: string;
  is_public: boolean;
  owner_id: number;
  
  // Новые поля
  mother_info?: ParentInfo;
  father_info?: ParentInfo;
  health_status?: HealthStatus;
}

const getMediaUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://127.0.0.1:8000${url}`;
};

export default function PetDetailsModal({ petId, isOpen, onClose }: { petId: number | null, isOpen: boolean, onClose: () => void }) {
  const [pet, setPet] = useState<PetDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'medical'>('info');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && petId) {
      setLoading(true);
      fetch(`http://127.0.0.1:8000/api/pets/${petId}/`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
      })
      .then(res => res.json())
      .then(data => {
          setPet(data);
          setCurrentImageIndex(0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    }
  }, [isOpen, petId]);

  if (!isOpen || !pet) return null;

  const allImages = pet.images?.map(img => img.image) || [];
  
  const nextImage = () => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };
  
  const prevImage = () => {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  // Определяем цвета для статуса здоровья
  const getStatusColor = (color?: string) => {
      if (color === 'red') return 'bg-red-100 text-red-800 border-red-200';
      if (color === 'yellow') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      return 'bg-green-100 text-green-800 border-green-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* === 1. КАРУСЕЛЬ === */}
        <div className="relative h-72 bg-gray-100 group">
            {allImages.length > 0 ? (
                <img 
                    src={getMediaUrl(allImages[currentImageIndex]) || ''} 
                    alt={pet.name} 
                    className="w-full h-full object-cover transition-opacity duration-300" 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ImageIcon size={48} />
                </div>
            )}

            {allImages.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                        <ChevronRight size={24} />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                        {allImages.map((_, idx) => (
                            <div key={idx} className={`w-2 h-2 rounded-full transition ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`} />
                        ))}
                    </div>
                </>
            )}

            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md z-30">
                <X size={20} />
            </button>
            
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent pt-20 pointer-events-none">
                <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                    {pet.name}
                    {pet.gender === 'F' ? <span className="text-pink-300">♀</span> : <span className="text-blue-300">♂</span>}
                </h2>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                    <span>{pet.age}</span>
                    <span>•</span>
                    <span>{pet.birth_date || 'Дата рождения не указана'}</span>
                </div>
            </div>
        </div>

        {/* === 2. ТЕЛО МОДАЛКИ === */}
        <div className="flex-1 overflow-y-auto bg-white flex flex-col">
            <div className="flex border-b border-gray-100 sticky top-0 bg-white z-10">
                <button 
                    onClick={() => setActiveTab('info')} 
                    className={`flex-1 py-4 font-bold text-sm ${activeTab === 'info' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
                >
                    Анкета
                </button>
                <button 
                    onClick={() => setActiveTab('medical')} 
                    className={`flex-1 py-4 font-bold text-sm ${activeTab === 'medical' ? 'text-black border-b-2 border-black' : 'text-gray-400'}`}
                >
                    Медкарта
                </button>
            </div>

            <div className="p-6 space-y-6">
                {activeTab === 'info' && (
                    <>
                         {/* СТАТУС ЗДОРОВЬЯ (СВЕТОФОР) */}
                         <div className={`p-4 rounded-xl border flex items-start gap-3 ${getStatusColor(pet.health_status?.color)}`}>
                             <div className="mt-0.5"><Activity size={18} /></div>
                             <div>
                                 <h4 className="font-bold text-sm">{pet.health_status?.label || 'Статус не определен'}</h4>
                                 <p className="text-xs opacity-80 mt-1">Основано на последних событиях медкарты</p>
                             </div>
                         </div>

                         {/* ТЕГИ */}
                        {pet.tags && pet.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {pet.tags.map((tag, index) => (
                                    <span 
                                        key={tag.id || index}
                                        className="px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-2 border border-gray-100"
                                    >
                                        {tag.icon && <img src={getMediaUrl(tag.icon)!} className="w-4 h-4 object-contain" alt="" />}
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* АТРИБУТЫ */}
                        <div className="grid grid-cols-2 gap-4">
                            <InfoCard 
                                icon={<Activity className="text-red-500" size={20} />} 
                                label="Клиника" 
                                value={pet.clinic_name || 'Не прикреплен'} 
                            />
                            {pet.attributes.map((attr, idx) => (
                                <InfoCard 
                                    key={idx}
                                    icon={
                                        attr.attribute.icon 
                                        ? <img src={getMediaUrl(attr.attribute.icon)!} className="w-5 h-5 object-contain" alt="" /> 
                                        : <FileText size={20} className="text-gray-400" />
                                    } 
                                    label={attr.attribute.name} 
                                    value={attr.value} 
                                />
                            ))}
                        </div>

                        {/* РОДИТЕЛИ */}
                        {(pet.mother_info || pet.father_info) && (
                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Родители</h3>
                                <div className="flex gap-4">
                                    {pet.mother_info && (
                                        <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-xl border border-pink-100 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-pink-200 flex items-center justify-center text-pink-600">♀</div>
                                            <div>
                                                <p className="text-xs text-pink-400 font-bold">Мама</p>
                                                <p className="font-bold text-gray-800">{pet.mother_info.name}</p>
                                            </div>
                                        </div>
                                    )}
                                    {pet.father_info && (
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-600">♂</div>
                                            <div>
                                                <p className="text-xs text-blue-400 font-bold">Папа</p>
                                                <p className="font-bold text-gray-800">{pet.father_info.name}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'medical' && (
                    <div className="text-center py-10">
                        <p className="text-gray-500">Заглушка медкарты</p>
                        {/* Сюда вставим код из прошлого шага, когда теги заработают */}
                        <a href={`/pet/${pet.id}`} className="mt-4 inline-block text-blue-600 font-bold">Перейти к полной карте →</a>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

const InfoCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden p-2">
            {icon}
        </div>
        <div className="overflow-hidden">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider truncate">{label}</p>
            <p className="font-bold text-gray-800 truncate">{value}</p>
        </div>
    </div>
);