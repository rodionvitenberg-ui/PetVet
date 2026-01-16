// types/event.ts
import { PetImage } from './pet';

// Типы категорий событий (совпадают с backend choices)
export type EventCategory = 'medical' | 'reproduction' | 'show' | 'care' | 'other';

export type EventStatus = 'planned' | 'completed' | 'missed';

// Схема JSON-полей (приходит с бэкенда в EventType)
export interface EventSchemaField {
    name: string; // ключ в JSON (например, "judge")
    label: string; // Подпись (например, "Судья")
    type: 'text' | 'number' | 'date' | 'select' | 'boolean';
    options?: string[]; // для select
    required?: boolean;
}

export interface EventSchema {
    fields?: EventSchemaField[];
}

// Тип события (Справочник)
export interface EventType {
    id: number;
    name: string;
    slug: string;
    category: EventCategory;
    icon?: string | null;
    default_schema?: EventSchema; // JSON Schema
    is_universal: boolean;
    is_custom: boolean;
}

export interface PetEventAttachment {
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

export interface PetEventCreator {
    id: number;
    name: string;
    is_vet: boolean;
    clinic_name?: string | null;
}

// ОСНОВНАЯ МОДЕЛЬ СОБЫТИЯ
export interface PetEvent {
    id: number;
    title: string;
    description?: string;
    date: string;       // YYYY-MM-DD
    next_date?: string | null;
    
    // Тип теперь объект, а не строка!
    event_type: EventType;
    event_type_display?: string; // fallback
    
    status: EventStatus;
    
    // Динамические данные (Вес, Судья, Ранг...)
    data?: Record<string, any>; 
    
    pet: PetShortInEvent;
    
    attachments?: PetEventAttachment[];
    
    is_verified: boolean;
    created_at: string;
    created_by?: number; // ID юзера
    created_by_info?: PetEventCreator;
}

// Payload для создания/редактирования
export interface PetEventPayload {
    pet: number; // ID питомца
    event_type_id: number; // ID типа
    title: string;
    description?: string;
    date: string;
    status: EventStatus;
    next_date?: string | null;
    
    // JSON данные
    data?: Record<string, any>;
}