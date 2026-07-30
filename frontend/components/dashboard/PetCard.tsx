'use client';

import React from 'react';
import { 
    Plus, 
    Mars, 
    Venus, 
    Globe 
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { PetBasic } from '@/types/pet'; 
import PetShareWidget from './PetShareWidget';

interface PetCardProps {
  isAddButton?: boolean;
  addButtonText?: string;
  pet?: PetBasic; 
  onClick?: () => void;
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
    variant = 'comfortable'
}: PetCardProps) {
  const { user } = useAuth();
  const isCompact = variant === 'compact';

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
            {addButtonText || 'Add Pet'}
        </span>
      </div>
    );
  }

  if (!pet) return null;

  const mainImageUrl = getMainImageUrl(pet.images);
  const canShare = user && (user.id === pet.owner || user.id === pet.created_by);

  return (
    <>
      <div 
        onClick={onClick}
        className={`group relative rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-2xl transition-all duration-500
            ${isCompact ? 'aspect-[4/3]' : 'aspect-[4/5]'}`}
      >
        <div className="absolute inset-0 bg-gray-200">
          {mainImageUrl ? (
             <img 
               src={mainImageUrl} 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
               alt={pet.name} 
             />
          ) : (
             <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                No photo
             </div>
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 transition-opacity duration-300" />

        {canShare && (
            <div className={`absolute z-10 ${isCompact ? 'top-2 right-2' : 'top-4 right-4'}`}>
              <PetShareWidget petId={pet.id} petName={pet.name} isCompact={isCompact} />
            </div>
        )}

        <div className={`absolute bottom-0 left-0 w-full text-white z-10 ${isCompact ? 'p-3' : 'p-5'}`}>
          <div className="flex justify-between items-end">
              <div>
                  <h3 className={`font-bold leading-tight mb-1 ${isCompact ? 'text-lg' : 'text-2xl'}`}>
                      {pet.name}
                  </h3>
                  <p className={`text-white/80 font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>
                      {pet.age || 'Age not specified'}
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

           {!isCompact && (
               <div className="flex items-center gap-2 mt-3 overflow-hidden">
                  {pet.species && (
                      <span className="text-[10px] px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 truncate max-w-[120px]">
                         {pet.species}
                      </span>
                  )}
                  {pet.breed && (
                      <span className="text-[10px] px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 truncate max-w-[120px]">
                         {pet.breed}
                      </span>
                  )}
               </div>
           )}
        </div>
      </div>
    </>
  );
}