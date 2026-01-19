'use client';

import React from 'react';
import { PetEvent } from '@/types/event';
import { Check, Clock, AlertCircle, FileText, Paperclip, ChevronRight } from 'lucide-react';

interface PlanboardCardProps {
    event: PetEvent;
    onToggle: (id: number, status: boolean) => void;
    variant?: 'default' | 'urgent' | 'completed';
    // [FIX] 1. Добавляем проп в интерфейс
    compact?: boolean; 
}

// [FIX] 2. Добавляем compact в аргументы функции и ставим дефолт false
export default function PlanboardCard({ event, onToggle, variant = 'default', compact = false }: PlanboardCardProps) {
    
    const isCompleted = event.status === 'completed';
    const eventDate = new Date(event.date);
    const now = new Date();
    
    // Проверка на просрочку (если событие в прошлом и не выполнено)
    const isOverdue = !isCompleted && eventDate < now;

    // === КОМПАКТНЫЙ РЕЖИМ ===
    if (compact) {
        return (
            <div className={`
                group flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-grab active:cursor-grabbing transition-all bg-white
                ${isCompleted ? 'opacity-60 bg-gray-50 border-gray-100' : 'hover:border-blue-300 hover:shadow-sm'}
                ${isOverdue && !isCompleted ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}
            `}>
                {/* Чекбокс */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggle(event.id, !isCompleted); }}
                    className={`
                        w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                        ${isCompleted 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'bg-white border-gray-300 hover:border-blue-500'
                        }
                    `}
                >
                    {isCompleted && <Check size={10} strokeWidth={4} />}
                </button>
                
                {/* Время */}
                <span className={`font-mono font-bold whitespace-nowrap ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                    {eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>

                {/* Заголовок */}
                <span className={`truncate font-medium flex-1 ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {event.title}
                </span>

                {/* Индикатор вложений (скрепка) */}
                {event.attachments && event.attachments.length > 0 && (
                    <Paperclip size={10} className="text-gray-400 shrink-0" />
                )}
            </div>
        );
    }

    // === ОБЫЧНЫЙ (ПРОСТОРНЫЙ) РЕЖИМ ===
    
    // Определение стилей в зависимости от варианта
    let containerClasses = "bg-white border-l-4 shadow-sm";
    let borderClass = "";
    
    if (variant === 'completed') {
        containerClasses = "bg-gray-50 border-l-4 border-gray-300 opacity-60 grayscale";
        borderClass = "border-gray-300";
    } else if (variant === 'urgent') {
        containerClasses = "bg-white border-l-4 border-red-500 shadow-sm";
        borderClass = "border-red-500";
    } else {
        // default / plans
        containerClasses = "bg-white border-l-4 border-blue-500 shadow-sm";
        borderClass = "border-blue-500";
    }

    if (isOverdue && !isCompleted) {
        containerClasses += " ring-1 ring-red-400";
    }

    return (
        <div className={`
            ${containerClasses} rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative overflow-hidden
        `}>
            <div className="flex items-start gap-3">
                {/* Чекбокс */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(event.id, !isCompleted);
                    }}
                    className={`
                        mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                        ${isCompleted 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300 hover:border-blue-500 text-transparent'
                        }
                    `}
                >
                    <Check size={12} strokeWidth={4} />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm leading-tight mb-1 ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                            {event.title}
                        </h4>
                        
                        {/* Время */}
                        <div className={`flex items-center gap-1 text-xs font-bold whitespace-nowrap ml-2
                            ${isOverdue ? 'text-red-600 animate-pulse' : 'text-gray-500'}
                        `}>
                            <Clock size={12} />
                            {eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>

                    {event.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                            {event.description}
                        </p>
                    )}

                    {/* Футер карточки */}
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100/50">
                        {/* Тип события (если есть иконка) */}
                        {event.event_type && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-1.5 py-0.5 rounded">
                                {event.event_type.icon && <img src={event.event_type.icon} className="w-3 h-3 opacity-50" />}
                                {event.event_type.name}
                            </div>
                        )}

                        {/* Вложения */}
                        {event.attachments && event.attachments.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                                <Paperclip size={10} />
                                {event.attachments.length}
                            </div>
                        )}
                    </div>
                </div>

                {/* Стрелочка при наведении (подсказка, что можно кликнуть) */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300">
                    <ChevronRight size={16} />
                </div>
            </div>
        </div>
    );
}