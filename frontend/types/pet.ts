// types/pet.ts

import { HealthEvent } from './event';

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
    is_temporary?: boolean; // <--- Поле, о котором ругался TS в page.tsx
}

// Интерфейс для временного владельца
export interface TemporaryOwnerProfile {
    id: null;
    name: string;
    phone?: string | null;
    avatar?: string | null;
    about?: string;
    is_temporary: boolean;
}

// === ТИПЫ АТРИБУТОВ ===
// Выносим их наверх, чтобы использовать и в Basic, и в Detail
export interface AttributeType {
    name: string;
    slug: string;
    icon: string | null;
}

export interface PetAttribute {
    attribute: AttributeType;
    value: string;
}

// Базовый питомец
export interface PetBasic {
    id: number;
    name: string;
    owner: number | null;
    owner_info?: UserProfile | TemporaryOwnerProfile;
    images?: PetImage[];
    is_active: boolean;
    gender: 'M' | 'F';
    age?: string;
    is_public: boolean;
    clinic_name?: string;
    
    // Новые поля
    temp_owner_name?: string;
    temp_owner_phone?: string;
    created_by?: number; // <--- [NEW] ID врача-создателя (для прав доступа)

    // [FIX] Теперь строго типизируем атрибуты, чтобы TS не ругался
    attributes?: PetAttribute[]; 
}

export interface PetTag {
    id: number;
    slug: string;
    name: string;
    icon: string | null;
}

export interface ParentInfo {
    id: number;
    name: string;
    gender: 'M' | 'F';
    image?: string | null;
}

export interface HealthStatus {
    status: 'healthy' | 'sick' | 'attention';
    label: string;
    color: string;
}

export interface PetDetail extends PetBasic {
    birth_date?: string;
    tags: PetTag[];
    description?: string;
    mother_info?: ParentInfo;
    father_info?: ParentInfo;
    health_status?: HealthStatus;
    active_vets: UserProfile[]; 
    recent_events?: HealthEvent[]; 
}