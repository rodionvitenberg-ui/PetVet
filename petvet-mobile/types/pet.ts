// types/pet.ts

import { PetEvent } from './event'; // Обрати внимание: HealthEvent переименован

export interface PetImage {
    id: number;
    image: string;
    is_main: boolean;
}

export type ContactType = 'phone' | 'whatsapp' | 'telegram' | 'instagram' | 'email' | 'site' | 'vk' | 'other';

export interface UserContact {
    id: number;
    type: ContactType;
    type_display: string;
    value: string;
    label?: string;
}

export interface UserProfile {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    about?: string;
    clinic_name?: string;
    city?: string;
    is_veterinarian: boolean;
    contacts: UserContact[];
    phone?: string;
    is_temporary?: boolean;
}

// Временный владелец (для карт, созданных врачом)
export interface TemporaryOwnerProfile {
    id: null;
    name: string;
    phone?: string | null;
    avatar?: string | null;
    about?: string;
    is_temporary: boolean;
}

// === СПРАВОЧНИКИ (НОВОЕ) ===

export interface Category {
    id: number;
    name: string;
    slug: string;
    icon?: string | null;
    parent?: number | null;
    sort_order?: number;
    children?: Category[]; // Для дерева категорий
}

export interface PetTag {
    id: number;
    slug: string;
    name: string;
    icon?: string | null;
    target_gender?: 'M' | 'F' | null;
    is_universal: boolean;
    is_custom: boolean; // Создан ли пользователем
}

export interface AttributeType {
    id: number;
    name: string;
    slug: string;
    unit?: string;
    icon?: string | null;
    is_universal: boolean;
    is_custom: boolean;
}

// Атрибут внутри питомца (значение)
export interface PetAttribute {
    attribute: AttributeType;
    value: string;
}

// Простой объект родителя (то, что возвращает поле mother/father)
export interface ParentSimple {
    id: number;
    name: string;
    slug: string;
}

// Расширенный объект родителя (для UI с фото)
export interface ParentInfo {
    id: number;
    name: string;
    gender: 'M' | 'F';
    image?: string | null;
}

// === ПИТОМЕЦ ===

export interface PetBasic {
    id: number;
    name: string;
    slug: string;
    owner: number | null; // ID владельца
    owner_info?: UserProfile | TemporaryOwnerProfile;
    
    // Медиа
    images?: PetImage[];
    
    // Основное
    is_active: boolean;
    is_public: boolean;
    gender: 'M' | 'F';
    birth_date?: string; // YYYY-MM-DD
    age?: string;        // Вычисляемое на бэке (например "2 года")
    description?: string;

    // Классификация (Read-only объекты)
    categories?: Category[]; 
    tags?: PetTag[];
    attributes?: PetAttribute[];
    
    // Хелперы
    species?: string; // Вид (Кошка)
    breed?: string;   // Порода (Мейн-кун)
    
    // Теневые данные
    temp_owner_name?: string;
    temp_owner_phone?: string;
    created_by?: number;
    clinic_name?: string | null;
}

export interface PetDetail extends PetBasic {
    // Родословная
    mother?: ParentSimple | null; // ID и имя
    father?: ParentSimple | null;
    mother_info?: ParentInfo | null; // Красивое превью
    father_info?: ParentInfo | null;

    // История
    active_vets: UserProfile[]; 
    recent_events?: PetEvent[]; 
    
    // Данные для входа (возвращаются только при создании пациента)
    generated_login?: string;
    generated_password?: string;
}

// === PAYLOADS (ДЛЯ ОТПРАВКИ НА БЭКЕНД) ===
// Используем это в PetForm
export interface PetPayload {
    name: string;
    gender: 'M' | 'F';
    birth_date?: string | null;
    description?: string;
    is_public: boolean;
    
    // ID-шники для связей
    categories: number[];
    tags: string[]; // Отправляем слаги тегов
    attributes: { attribute_slug: string; value: string }[];
    
    mother?: number | null; // ID
    father?: number | null; // ID
    
    // Теневой владелец
    temp_owner_name?: string;
    temp_owner_phone?: string;
}