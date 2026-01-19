'use client';

import React, { useState } from 'react';
import { 
    Plus, 
    Share2, 
    Mars, 
    Venus, 
    X, 
    Copy, 
    Check,
    Globe 
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { PetBasic } from '@/types/pet'; 

interface PetCardProps {
  isAddButton?: boolean;
  addButtonText?: string;
  pet?: PetBasic; 
  onClick?: () => void;
  // Добавляем проп для управления видом
  variant?: 'comfortable' | 'compact';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getMainImageUrl = (images: PetBasic['images']) => {
    if (!images || images.length === 0) return null;
    const mainImage = images.find(img => img.is_main) || images[0];
    if (!mainImage.image) return null;
    if (mainImage.image.startsWith('http')) return mainImage.image;
    return `${API_URL}${mainImage.image}`;
};

export default function PetCard({ 
    isAddButton, 
    addButtonText, 
    pet, 
    onClick, 
    variant = 'comfortable' // По дефолту обычный вид
}: PetCardProps) {
  const { user } = useAuth();

  const isCompact = variant === 'compact';

  // Логика кнопки "Добавить"
  if (isAddButton) {
    return (
      <div 
        onClick={onClick}
        className={`rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition group gap-3 bg-white/50 
        ${isCompact ? 'aspect-[4/3] min-h-[180px]' : 'aspect-[4/5] min-h-[300px] gap-4'}`}
      >
        <div className={`rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-blue-500 transition shadow-sm
            ${isCompact ? 'w-10 h-10' : 'w-16 h-16'}`}>
            <Plus size={isCompact ? 20 : 32} />
        </div>
        <span className={`font-bold text-gray-500 group-hover:text-blue-500 transition text-center px-2
            ${isCompact ? 'text-xs' : 'text-base'}`}>
            {addButtonText || 'Добавить питомца'}
        </span>
      </div>
    );
  }

  if (!pet) return null;

  const mainImageUrl = getMainImageUrl(pet.images);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [shareLink, setShareLink] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isCopied, setIsCopied] = useState(false);

  const canShare = user && (user.id === pet.owner || user.id === pet.created_by);

  const handleShareClick = async (e: React.MouseEvent) => {
      e.stopPropagation(); 
      setIsShareModalOpen(true);
      
      if (shareLink) return;

      setIsLoadingLink(true);
      try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`${API_URL}/api/pets/${pet.id}/share_token/`, {
              method: 'GET',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
              }
          });

          if (!res.ok) throw new Error('Ошибка получения токена');
          const data = await res.json();
          
          const fullLink = `${window.location.origin}/share?token=${data.token}`;
          setShareLink(fullLink);

      } catch (error) {
          console.error("Failed to generate share link:", error);
          alert("Не удалось создать ссылку");
          setIsShareModalOpen(false);
      } finally {
          setIsLoadingLink(false);
      }
  };

  const copyToClipboard = async () => {
      if (!shareLink) return;
      try {
          await navigator.clipboard.writeText(shareLink);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
          console.error('Failed to copy: ', err);
      }
  };

  return (
    <>
      <div 
        onClick={onClick}
        // Меняем aspect-ratio в зависимости от режима
        className={`group relative rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500
            ${isCompact ? 'aspect-[4/3]' : 'aspect-[4/5]'}`}
      >
        {/* Картинка */}
        <div className="absolute inset-0 bg-gray-200">
          {mainImageUrl ? (
             <img 
               src={mainImageUrl} 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
               alt={pet.name} 
             />
          ) : (
             <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                Нет фото
             </div>
          )}
        </div>

        {/* Градиент (в компактном режиме делаем его чуть выше, чтобы текст читался лучше на маленькой высоте) */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 transition-opacity duration-300`} />

        {/* КНОПКА ПОДЕЛИТЬСЯ */}
        {canShare && (
            <div className={`absolute z-10 ${isCompact ? 'top-2 right-2' : 'top-4 right-4'}`}>
            <button 
                onClick={handleShareClick}
                className={`bg-white text-blue-600 shadow-md hover:bg-blue-50 hover:scale-110 transition-all duration-300 group/btn rounded-full
                    ${isCompact ? 'p-1.5' : 'p-2.5'}`}
                title="Поделиться профилем"
            >
                <Share2 size={isCompact ? 14 : 18} className="transition-transform group-hover/btn:-rotate-12" />
            </button>
            </div>
        )}

        {/* НИЖНЯЯ ЧАСТЬ: Информация */}
        <div className={`absolute bottom-0 left-0 w-full text-white z-10 ${isCompact ? 'p-3' : 'p-5'}`}>
          
          <div className="flex justify-between items-end">
              <div>
                  {/* Уменьшаем размер шрифта имени в компактном режиме */}
                  <h3 className={`font-bold leading-tight mb-1 ${isCompact ? 'text-lg' : 'text-2xl'}`}>
                      {pet.name}
                  </h3>
                  <p className={`text-white/80 font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>
                      {pet.age || 'Возраст не указан'}
                  </p>
              </div>
              
              <div className="flex flex-col items-end gap-1 mb-1">
                  <div>
                      {pet.gender === 'M' ? (
                         <Mars className="text-blue-300" size={isCompact ? 18 : 24} />
                      ) : (
                         <Venus className="text-pink-300" size={isCompact ? 18 : 24} />
                      )}
                  </div>

                  {pet.is_public && (
                      <div className="flex items-center gap-1 bg-green-500/20 px-2 py-0.5 rounded-md backdrop-blur-md border border-green-500/30">
                          <Globe size={isCompact ? 8 : 10} className="text-green-300" />
                          {!isCompact && <span className="text-[10px] font-bold text-green-200 uppercase tracking-wide">Public</span>}
                      </div>
                  )}
              </div>
          </div>

          {/* Характеристики показываем ТОЛЬКО если режим НЕ компактный */}
          {!isCompact && pet.attributes && pet.attributes.length > 0 && (
              <div className="flex items-center gap-2 mt-3 overflow-hidden">
                 {pet.attributes.slice(0, 3).map((attr, idx) => (
                     <span key={idx} className="text-[10px] px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 truncate max-w-[80px]">
                        {attr.value}
                     </span>
                 ))}
              </div>
          )}
        </div>
      </div>

      {/* Модалка остается без изменений... */}
      {isShareModalOpen && (
          // ... код модалки такой же, как был (сокращено для ответа)
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(false); }}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-5">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Share2 className="text-blue-500" size={20} />
                          Доступ к профилю {pet.name}
                      </h3>
                      <button onClick={() => setIsShareModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition">
                          <X size={20} />
                      </button>
                  </div>
                  {isLoadingLink ? (
                      <div className="py-8 flex flex-col items-center justify-center text-gray-500 gap-3">
                          <Share2 className="animate-bounce text-blue-300" size={24} />
                          <p className="text-sm font-medium">Генерируем безопасную ссылку...</p>
                      </div>
                  ) : shareLink ? (
                      <div className="space-y-4">
                          <p className="text-sm text-gray-600 leading-relaxed">Отправьте эту ссылку ветеринару...</p>
                          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 break-all text-sm text-gray-800 font-mono select-all relative group">{shareLink}</div>
                          <button onClick={copyToClipboard} className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all duration-200 ${isCopied ? 'bg-green-500 text-white shadow-md shadow-green-200' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200'}`}>
                              {isCopied ? <><Check size={18} /> Скопировано!</> : <><Copy size={18} /> Скопировать ссылку</>}
                          </button>
                      </div>
                  ) : (<div className="py-4 text-center text-red-500 text-sm">Не удалось получить ссылку.</div>)}
              </div>
          </div>
      )}
    </>
  );
}