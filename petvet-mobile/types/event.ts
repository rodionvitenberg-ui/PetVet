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
    owner_id?: number;
    images?: PetImage[];
}

export interface HealthEvent {
    id: number;
    title: string;
    description?: string;
    date: string;       // ISO String
    
    // Добавил | null, так как Django часто шлет null вместо отсутствия поля
    next_date?: string | null; 
    
    event_type: EventType;
    event_type_display: string;
    
    status: EventStatus;
    status_display: string;
    is_completed: boolean;
    
    pet: PetShortInEvent;
    
    // !!! ГЛАВНАЯ ПРАВКА: Добавлен '?'
    // Это разрешает использование event.attachments?.map() и защищает от ошибок
    attachments?: HealthEventAttachment[];
    
    // Кто создал
    created_by_name?: string;
    created_by_clinic?: string;
    created_by_is_vet?: boolean;
}