'use client';

import React, { useState } from 'react';
import { ChevronLeft, ImageIcon, Calendar, PawPrint, User } from 'lucide-react';
import { PetDetail } from '@/types/pet';
import { getMediaUrl } from '@/components/dashboard/PetDetailUtils';

interface PetHeroCarouselProps {
  pet: PetDetail;
  onBack: () => void;
  onOwnerClick: () => void;
  showOwnerLink: boolean;
}

export default function PetHeroCarousel({ pet, onBack, onOwnerClick, showOwnerLink }: PetHeroCarouselProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);

  const allImages = pet.images?.map(img => img.image) || [];

  const nextImage = () => {
    if (allImages.length === 0) return;
    setCurrentImageIndex(prev => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    if (allImages.length === 0) return;
    setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setSwipeStart(x);
  };

  const handleSwipeEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (swipeStart === null) return;

    const x = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = swipeStart - x;
    const threshold = 50;

    if (diff > threshold) nextImage();
    else if (diff < -threshold) prevImage();

    setSwipeStart(null);
  };

  return (
    <div
      className="relative h-72 sm:h-96 bg-foreground shrink-0 group cursor-grab active:cursor-grabbing select-none touch-pan-y"
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
        <div className="w-full h-full flex items-center justify-center text-muted-foreground z-10 relative bg-muted pointer-events-none">
          <ImageIcon size={64} opacity={0.3} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-20 pointer-events-none" />

      {/* КНОПКА НАЗАД */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 px-4 py-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-md z-50 transition flex items-center gap-2 text-sm font-bold border border-white/10 pointer-events-auto"
      >
        <ChevronLeft size={18} /> Назад
      </button>

      {allImages.length > 1 && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 pointer-events-none">
          {allImages.map((_, idx) => (
            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-card w-4' : 'bg-card/50'}`} />
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-30 pointer-events-none">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
              {pet.name}
              {pet.gender === 'F'
                ? <span className="w-8 h-8 rounded-full bg-accent/80 flex items-center justify-center text-white text-sm border border-white/20">♀</span>
                : <span className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center text-primary-foreground text-sm border border-white/20">♂</span>
              }
            </h1>

            {showOwnerLink && pet.owner_info && (
              <div
                onClick={(e) => { e.stopPropagation(); onOwnerClick(); }}
                className="inline-flex items-center gap-2 bg-card/10 hover:bg-card/20 px-3 py-1.5 rounded-lg backdrop-blur-md cursor-pointer transition-colors border border-white/10 mb-3 pointer-events-auto"
              >
                <div className="w-6 h-6 rounded-full bg-card/20 flex items-center justify-center overflow-hidden">
                  {pet.owner_info.avatar ? (
                    <img src={getMediaUrl(pet.owner_info.avatar)!} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <User size={14} className="text-white" />
                  )}
                </div>
                <span className="text-white text-sm font-medium">Владелец: {pet.owner_info.name}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm font-medium">
              {pet.breed && (
                <span className="bg-card/20 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10 flex items-center gap-2">
                  <PawPrint size={16} className="opacity-80" />
                  {pet.breed}
                </span>
              )}

              <span className="bg-card/20 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10">{pet.age || 'Возраст скрыт'}</span>
              <span className="flex items-center gap-1.5 opacity-90 bg-black/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                <Calendar size={16} />
                {pet.birth_date ? new Date(pet.birth_date).toLocaleDateString('ru-RU') : 'Дата скрыта'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}