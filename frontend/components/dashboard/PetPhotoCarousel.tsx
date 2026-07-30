'use client';

import React from 'react';
import { X, ImageIcon, User } from 'lucide-react';
import { getMediaUrl } from './PetDetailUtils';

interface PetPhotoCarouselProps {
  images: string[];
  currentIndex: number;
  petName: string;
  petOwnerName?: string;
  petOwnerAvatar?: string | null;
  petGender?: string;
  petBreed?: string | null;
  petBirthDate?: string | null;
  onClose: () => void;
  onOwnerClick?: () => void;
  onSwipeStart: (e: React.TouchEvent | React.MouseEvent) => void;
  onSwipeEnd: (e: React.TouchEvent | React.MouseEvent) => void;
}

export default function PetPhotoCarousel({
  images, currentIndex, petName, petOwnerName, petOwnerAvatar,
  petGender, petBreed, petBirthDate,
  onClose, onOwnerClick, onSwipeStart, onSwipeEnd,
}: PetPhotoCarouselProps) {
  const allImages = images || [];

  return (
    <div 
      className="relative h-64 bg-gray-900 shrink-0 group cursor-grab active:cursor-grabbing select-none touch-pan-y"
      onTouchStart={onSwipeStart}
      onTouchEnd={onSwipeEnd}
      onMouseDown={onSwipeStart}
      onMouseUp={onSwipeEnd}
    >
      {allImages.length > 0 ? (
        <>
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ 
              backgroundImage: `url(${getMediaUrl(allImages[currentIndex])})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <img 
            key={currentIndex}
            src={getMediaUrl(allImages[currentIndex]) || ''} 
            alt={petName} 
            draggable={false} 
            className="relative w-full h-full object-cover z-10 transition-all duration-300" 
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-600 z-10 relative bg-gray-100">
          <ImageIcon size={48} opacity={0.5} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20 pointer-events-none" />

      <button onClick={onClose} className="cursor-pointer absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full z-40 transition pointer-events-auto">
        <X size={20} />
      </button>

      {allImages.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 pointer-events-none">
          {allImages.map((_, idx) => (
            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-3' : 'bg-white/50'}`} />
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 z-30">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          {petName}
          {petGender === 'F' 
            ? <span className="w-6 h-6 rounded-full bg-pink-500/80 flex items-center justify-center text-white text-xs border border-white/20">♀</span>
            : <span className="w-6 h-6 rounded-full bg-blue-500/80 flex items-center justify-center text-white text-xs border border-white/20">♂</span>
          }
        </h2>

        {petOwnerName && onOwnerClick && (
          <div 
            onClick={onOwnerClick}
            className="mt-2 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-white/10"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
              {petOwnerAvatar ? (
                <img src={getMediaUrl(petOwnerAvatar)!} className="w-full h-full object-cover" />
              ) : (
                <User size={12} className="text-white" />
              )}
            </div>
            <span className="text-white text-xs font-medium">Owner: {petOwnerName}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-white/90 text-sm mt-2 font-medium">
          {petBreed && (
            <span className="bg-white/10 px-2 py-0.5 rounded flex items-center gap-1 border border-white/10">{petBreed}</span>
          )}
          <span className="flex items-center gap-1 opacity-80 text-xs">
            {petBirthDate ? new Date(petBirthDate).toLocaleDateString('ru-RU') : 'Date of Birth not specified'}
          </span>
        </div>
      </div>
    </div>
  );
}