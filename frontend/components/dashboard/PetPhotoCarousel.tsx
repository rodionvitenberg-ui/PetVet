'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  panY: number;
  onPanYChange: (y: number) => void;
  onClose: () => void;
  onOwnerClick?: () => void;
  onSwipeStart: (e: React.TouchEvent | React.MouseEvent) => void;
  onSwipeEnd: (e: React.TouchEvent | React.MouseEvent) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const coverSize = (natW: number, natH: number, boxW: number, boxH: number) => {
  const scale = Math.max(boxW / natW, boxH / natH);
  return { w: natW * scale, h: natH * scale };
};

export default function PetPhotoCarousel({
  images, currentIndex, petName, petOwnerName, petOwnerAvatar,
  petGender, petBreed, petBirthDate,
  panY, onPanYChange,
  onClose, onOwnerClick, onSwipeStart, onSwipeEnd,
}: PetPhotoCarouselProps) {
  const allImages = images || [];

  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const dragYRef = useRef<{ startY: number; panY: number } | null>(null);

  const syncSize = () => {
    const frame = frameRef.current;
    const img = imgRef.current;
    if (!frame || !img || !img.naturalWidth || !img.naturalHeight) return;
    const size = coverSize(img.naturalWidth, img.naturalHeight, frame.clientWidth, frame.clientHeight);
    setImgSize((prev) => (prev && prev.w === size.w && prev.h === size.h ? prev : size));
  };

  useEffect(() => {
    setImgSize(null);
    const raf = requestAnimationFrame(() => {
      syncSize();
      requestAnimationFrame(syncSize);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const maxY = imgSize ? Math.max(0, (imgSize.h - (frameRef.current?.clientHeight || 0)) / 2) : 0;

  const onFrameMouseDown = (e: React.MouseEvent) => {
    if (maxY > 0) {
      // Вертикальный пан доступен: берём управление на себя.
      e.preventDefault();
      dragYRef.current = { startY: e.clientY, panY };
    } else {
      // Листание фото по горизонтали.
      onSwipeStart(e);
    }
  };

  const onFrameMouseMove = (e: React.MouseEvent) => {
    if (!dragYRef.current) return;
    onPanYChange(clamp(dragYRef.current.panY + (e.clientY - dragYRef.current.startY), -maxY, maxY));
  };

  const onFrameMouseUp = (e: React.MouseEvent) => {
    const hadDrag = !!dragYRef.current;
    dragYRef.current = null;
    if (!hadDrag) onSwipeEnd(e);
  };

  return (
    <div className="relative h-64 bg-gray-900 shrink-0 select-none touch-pan-y overflow-hidden">
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
          <div
            ref={frameRef}
            className={`absolute inset-0 z-10 flex items-center justify-center ${maxY > 0 ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
            onMouseDown={onFrameMouseDown}
            onMouseMove={onFrameMouseMove}
            onMouseUp={onFrameMouseUp}
            onMouseLeave={() => { dragYRef.current = null; }}
            onTouchStart={onSwipeStart}
            onTouchEnd={onSwipeEnd}
          >
            {imgSize ? (
              <img
                ref={imgRef}
                key={currentIndex}
                src={getMediaUrl(allImages[currentIndex]) || ''}
                alt={petName}
                draggable={false}
                onLoad={syncSize}
                className="pointer-events-none max-w-none"
                style={{
                  width: imgSize.w,
                  height: imgSize.h,
                  transform: `translateY(${panY}px)`,
                }}
              />
            ) : (
              <img
                ref={imgRef}
                className="max-w-none"
                style={{ visibility: 'hidden' }}
                key={currentIndex}
                src={getMediaUrl(allImages[currentIndex]) || ''}
                onLoad={syncSize}
                alt=""
              />
            )}
          </div>
        </>
      ) : (
        <div className="z-10 relative flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          <ImageIcon size={48} opacity={0.5} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20 pointer-events-none" />

      <button onClick={onClose} className="cursor-pointer absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full z-40 transition pointer-events-auto">
        <X size={20} />
      </button>

      {allImages.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 pointer-events-none">
          {allImages.map((_, idx) => (
            <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-3' : 'bg-white/50'}`} />
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 z-30 pointer-events-none">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          {petName}
          {petGender === 'F'
            ? <span className="w-6 h-6 rounded-full bg-accent/80 flex items-center justify-center text-white text-xs border border-white/20">♀</span>
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