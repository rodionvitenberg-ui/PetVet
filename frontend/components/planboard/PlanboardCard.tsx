'use client';

import React from 'react';
import { 
  Syringe, Pill, Stethoscope, 
  Scissors, Sparkles, AlertCircle, 
  Check, Calendar, Heart, Trophy, HelpCircle
} from 'lucide-react';
import { PetEvent, EventCategory } from '@/types/event'; // Обновленные типы

// Маппинг по CATEGORY (так как event_type теперь объект)
const CATEGORY_CONFIG: Record<EventCategory | 'default', { icon: React.ReactNode; color: string; bg: string }> = {
  medical: { icon: <Stethoscope size={18} />, color: 'text-red-600', bg: 'bg-red-50' },
  // Если у вас есть категория vaccine, добавьте её в типы, иначе используем medical
  reproduction: { icon: <Heart size={18} />, color: 'text-pink-600', bg: 'bg-pink-50' },
  show: { icon: <Trophy size={18} />, color: 'text-amber-600', bg: 'bg-amber-50' },
  care: { icon: <Sparkles size={18} />, color: 'text-purple-600', bg: 'bg-purple-50' },
  other: { icon: <HelpCircle size={18} />, color: 'text-gray-600', bg: 'bg-gray-50' },
  default: { icon: <AlertCircle size={18} />, color: 'text-gray-600', bg: 'bg-gray-50' }
};

interface PlanboardCardProps {
  event: PetEvent;
  onToggle: (id: number, isCompleted: boolean) => void;
  variant?: 'urgent' | 'default' | 'completed';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getMediaUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
};

export default function PlanboardCard({ event, onToggle, variant = 'default' }: PlanboardCardProps) {
  // Определяем конфиг по категории или дефолтный
  const category = event.event_type?.category || 'other';
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['default'];
  
  const formattedDate = new Date(event.date).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long'
  });

  const isCompleted = event.status === 'completed';

  return (
    <div className={`
      relative p-4 rounded-xl border transition-all duration-200 group h-full
      ${isCompleted || event.status === 'missed' // Статус missed тоже делаем бледным
        ? 'bg-gray-50 border-gray-100 opacity-80' 
        : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
      }
      ${variant === 'urgent' && !isCompleted ? 'border-l-4 border-l-red-500' : ''}
    `}>
      
      <div className="flex justify-between items-start gap-3">
        {/* Иконка: Либо с бэка, либо дефолтная из конфига */}
        <div className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 ${config.bg} ${config.color}`}>
           {event.event_type?.icon ? (
               <img src={getMediaUrl(event.event_type.icon)!} className="w-5 h-5 object-contain" alt="" />
           ) : (
               config.icon
           )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">
            {event.pet.name}
          </div>
          
          <h4 className={`text-sm font-bold leading-tight ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {event.title}
          </h4>
          
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 font-medium">
            <Calendar size={12} />
            <span className={variant === 'urgent' ? 'text-red-600 font-bold' : ''}>
              {formattedDate}
            </span>
          </div>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation(); 
            // Передаем ТЕКУЩЕЕ состояние, чтобы переключить его
            onToggle(event.id, isCompleted);
          }}
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer z-10 shrink-0
            ${isCompleted 
              ? 'bg-green-500 border-green-500 text-white' 
              : 'border-gray-300 hover:border-blue-500 text-transparent hover:text-blue-200'
            }
          `}
        >
          <Check size={14} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}