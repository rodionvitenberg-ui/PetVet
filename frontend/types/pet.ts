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
    type_display: string; // "WhatsApp" (с бэка)
    value: string;
    label?: string; // "Рабочий"
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
    
    // [NEW] Заменяем жесткие поля на массив
    contacts: UserContact[]; 
    
    // Старые поля можно оставить как опциональные fallback, если база еще не мигрирована полностью
    phone?: string; 
}

// Базовый питомец (для списков Dashboard)
export interface PetBasic {
    id: number;
    name: string;
    owner: number; // ID владельца
    owner_info?: UserProfile; // <-- Используем UserProfile вместо обрезанного OwnerInfo
    images?: PetImage[];
    is_active: boolean;
    gender: 'M' | 'F';
    age?: string;
    is_public: boolean;
    clinic_name?: string; // Текстовое поле (старое)
    attributes?: { attribute: { name: string }; value: string }[];
}

// === ТИПЫ ДЛЯ ДЕТАЛЬНОЙ АНКЕТЫ (PetDetails) ===

export interface AttributeType {
    name: string;
    slug: string;
    icon: string | null;
}

export interface PetAttribute {
    attribute: AttributeType;
    value: string;
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

// Полная анкета питомца
// Наследуем от PetBasic, чтобы не дублировать общие поля
export interface PetDetail extends PetBasic {
    birth_date?: string;
    attributes: PetAttribute[];
    tags: PetTag[];
    description?: string;
    
    mother_info?: ParentInfo;
    father_info?: ParentInfo;
    health_status?: HealthStatus;
    
    // [NEW] Список врачей, имеющих доступ (для кликабельной клиники)
    active_vets: UserProfile[]; 
    
    // События (нужны импорт из event.ts, но чтобы избежать циклической зависимости,
    // в компоненте часто используют any или отдельный тип. 
    // Пока оставим опциональным any или подключим позже).
    recent_events?: HealthEvent[]; 
}