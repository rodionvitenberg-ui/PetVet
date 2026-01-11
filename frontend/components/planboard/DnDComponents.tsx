'use client';

import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

// === КОМПОНЕНТ ПЕРЕТАСКИВАЕМОЙ КАРТОЧКИ ===
export function DraggableCard({ id, children, disabled }: { id: number; children: React.ReactNode; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `event-${id}`, // Уникальный строковый ID для dnd-kit
    data: { id },
    disabled
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 999,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className={`touch-none ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'}`}
    >
      {children}
    </div>
  );
}

// === КОМПОНЕНТ КОЛОНКИ (ЗОНА СБРОСА) ===
export function DroppableColumn({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`${className} transition-colors duration-200 ${isOver ? 'bg-blue-50/80 ring-2 ring-blue-200 ring-inset' : ''}`}
    >
      {children}
    </div>
  );
}