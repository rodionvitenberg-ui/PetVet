// types/event.ts
import { PetImage } from './pet';

export type EventType = 'vaccine' | 'medical' | 'parasite' | 'surgery' | 'hygiene' | 'other';
export type EventStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled';

export interface HealthEventAttachment {
    id: number;
    file: string;
    created_at: string;
}

// Мини-версия питомца внутри события
export interface PetShortInEvent {
    id: number;
    name: string;
    owner_id?: number; // Важно для фильтрации в Канбане
    images?: PetImage[];
}

export interface HealthEvent {
    id: number;
    title: string;
    description?: string;
    date: string;       // ISO String
    next_date?: string; // Напоминание
    
    event_type: EventType;
    event_type_display: string; // "Вакцинация"
    
    status: EventStatus;
    status_display: string; // "Завершено"
    is_completed: boolean;  // Легаси поле, но мы его поддерживаем
    
    pet: PetShortInEvent;
    
    attachments: HealthEventAttachment[];
    
    // Кто создал
    created_by_name?: string;
    created_by_clinic?: string;
    created_by_is_vet?: boolean;
}