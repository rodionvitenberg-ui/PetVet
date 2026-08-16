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
                group flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-grab active:cursor-grabbing transition-all bg-card
                ${isCompleted ? 'opacity-60 bg-muted border-border' : 'hover:border-primary/40 hover:shadow-sm'}
                ${isOverdue && !isCompleted ? 'border-destructive/20 bg-destructive/10' : 'border-border'}
            `}>
                {/* Чекбокс */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggle(event.id, !isCompleted); }}
                    className={`
                        w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                        ${isCompleted 
                            ? 'bg-success border-success text-success-foreground'
                            : 'bg-card border-border hover:border-primary'
                        }
                    `}
                >
                    {isCompleted && <Check size={10} strokeWidth={4} />}
                </button>
                
                {/* Время */}
                <span className={`font-mono font-bold whitespace-nowrap ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>

                {/* Заголовок */}
                <span className={`truncate font-medium flex-1 ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {event.title}
                </span>

                {/* Индикатор вложений (скрепка) */}
                {event.attachments && event.attachments.length > 0 && (
                    <Paperclip size={10} className="text-muted-foreground shrink-0" />
                )}
            </div>
        );
    }

    // === ОБЫЧНЫЙ (ПРОСТОРНЫЙ) РЕЖИМ ===
    
    // Определение стилей в зависимости от варианта
    let containerClasses = "bg-card border-l-4 shadow-sm";
    let borderClass = "";
    
    if (variant === 'completed') {
        containerClasses = "bg-muted border-l-4 border-border opacity-60 grayscale";
        borderClass = "border-border";
    } else if (variant === 'urgent') {
        containerClasses = "bg-card border-l-4 border-destructive shadow-sm";
        borderClass = "border-destructive";
    } else {
        // default / plans
        containerClasses = "bg-card border-l-4 border-primary shadow-sm";
        borderClass = "border-primary";
    }

    if (isOverdue && !isCompleted) {
        containerClasses += " ring-1 ring-destructive/40";
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
                            ? 'bg-success border-success text-success-foreground'
                            : 'border-border hover:border-primary text-transparent'
                        }
                    `}
                >
                    <Check size={12} strokeWidth={4} />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm leading-tight mb-1 ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {event.title}
                        </h4>
                        
                        {/* Время */}
                        <div className={`flex items-center gap-1 text-xs font-bold whitespace-nowrap ml-2
                            ${isOverdue ? 'text-destructive animate-pulse' : 'text-muted-foreground'}
                        `}>
                            <Clock size={12} />
                            {eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>

                    {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {event.description}
                        </p>
                    )}

                    {/* Футер карточки */}
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
                        {/* Тип события (если есть иконка) */}
                        {event.event_type && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
                                {event.event_type.icon && <img src={event.event_type.icon} className="w-3 h-3 opacity-50" />}
                                {event.event_type.name}
                            </div>
                        )}

                        {/* Вложения */}
                        {event.attachments && event.attachments.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">
                                <Paperclip size={10} />
                                {event.attachments.length}
                            </div>
                        )}
                    </div>
                </div>

                {/* Стрелочка при наведении (подсказка, что можно кликнуть) */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                    <ChevronRight size={16} />
                </div>
            </div>
        </div>
    );
}