'use client';

import React from 'react';
import { 
  Syringe, Pill, Stethoscope, 
  Scissors, Sparkles, AlertCircle, 
  Check, Calendar
} from 'lucide-react';
import { HealthEvent, EventType } from '@/types/event';

// Маппинг иконок и цветов по типу события
const TYPE_CONFIG: Record<EventType, { icon: React.ReactNode; color: string; bg: string }> = {
  vaccine: { icon: <Syringe size={18} />, color: 'text-blue-600', bg: 'bg-blue-50' },
  medical: { icon: <Stethoscope size={18} />, color: 'text-red-600', bg: 'bg-red-50' },
  parasite: { icon: <Pill size={18} />, color: 'text-purple-600', bg: 'bg-purple-50' },
  surgery: { icon: <Scissors size={18} />, color: 'text-orange-600', bg: 'bg-orange-50' },
  hygiene: { icon: <Sparkles size={18} />, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  other: { icon: <AlertCircle size={18} />, color: 'text-gray-600', bg: 'bg-gray-50' },
};

interface PlanboardCardProps {
  event: HealthEvent;
  onToggle: (id: number, currentStatus: boolean) => void;
  variant?: 'urgent' | 'default' | 'completed';
}

export default function PlanboardCard({ event, onToggle, variant = 'default' }: PlanboardCardProps) {
  const config = TYPE_CONFIG[event.event_type] || TYPE_CONFIG['other'];
  
  const formattedDate = new Date(event.date).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long'
  });

  // Логика зачеркивания: Зачеркиваем только если статус 'completed'. 
  // Если 'cancelled' или активен — не зачеркиваем.
  const isStrikethrough = event.status === 'completed';

  return (
    <div className={`
      relative p-4 rounded-xl border transition-all duration-200 group h-full
      ${event.is_completed || event.status === 'cancelled'
        ? 'bg-gray-50 border-gray-100 opacity-80' 
        : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
      }
      ${variant === 'urgent' && !event.is_completed ? 'border-l-4 border-l-red-500' : ''}
    `}>
      
      <div className="flex justify-between items-start gap-3">
        {/* Иконка */}
        <div className={`p-2 rounded-full shrink-0 ${config.bg} ${config.color}`}>
          {config.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">
            {event.pet.name}
          </div>
          
          <h4 className={`text-sm font-bold leading-tight ${isStrikethrough ? 'line-through text-gray-400' : 'text-gray-900'}`}>
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
            onToggle(event.id, event.is_completed);
          }}
          // При перетаскивании лучше использовать onPointerDown, чтобы не конфликтовало, но onClick ок
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer z-10
            ${event.is_completed 
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