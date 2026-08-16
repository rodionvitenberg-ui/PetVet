// types/pet.ts

import { PetEvent } from './event'; // Note: HealthEvent has been renamed

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

// Temporary owner (for cards created by a vet before owner registration)
export interface TemporaryOwnerProfile {
    id: null;
    name: string;
    phone?: string | null;
    avatar?: string | null;
    about?: string;
    is_temporary: boolean;
}

// The owner_info object from PetSerializer.get_owner_info (owner or shadow/temporary)
export interface OwnerInfo {
    id: number | null;
    name: string;
    email: string | null;
    phone?: string | null;
    telegram?: string | null;
    avatar?: string | null;
    about?: string | null;
    is_temporary: boolean;
}

// === REFERENCE DATA ===

export interface Category {
    id: number;
    name: string;
    slug: string;
    icon?: string | null;
    parent?: number | null;
    sort_order?: number;
    children?: Category[];
    attributes?: AttributeType[];
}

export interface PetTag {
    id: number;
    slug: string;
    name: string;
    icon?: string | null;
    target_gender?: 'M' | 'F' | null;
    is_universal: boolean;
    is_custom: boolean; // Created by the user
}

export interface AttributeType {
    id: number;
    name: string;
    slug: string;
    unit?: string;
    icon?: string | null;
    is_universal: boolean;
    is_custom: boolean;
    attr_type: 'text' | 'number' | 'select' | 'checkbox' | 'date';
    options?: string[];
}

// Attribute value inside a pet
export interface PetAttribute {
    attribute: AttributeType;
    value: string;
}

// Simple parent object (what the mother/father field returns)
export interface ParentSimple {
    id: number;
    name: string;
    slug: string;
}

// Extended parent object (for UI with photo)
export interface ParentInfo {
    id: number;
    name: string;
    gender: 'M' | 'F';
    image?: string | null;
}

// === PET ===

export interface PetBasic {
    id: number;
    name: string;
    slug: string;
    owner: number | null; // Owner user ID
    owner_info?: OwnerInfo | null;
    
    // Media
    images?: PetImage[];
    
    // Core
    is_active: boolean;
    is_public: boolean;
    gender: 'M' | 'F';
    birth_date?: string; // YYYY-MM-DD
    age?: string;        // Computed on the backend (e.g. "2 years")
    description?: string;
    clinic?: number | null; // Clinic ID
    created_at?: string;

    // Classification (read-only objects)
    categories?: Category[]; 
    tags?: PetTag[];
    attributes?: PetAttribute[];
    
    // Helpers
    species?: string; // Species (Cat)
    breed?: string;   // Breed (Maine Coon)
    
    // Shadow data
    temp_owner_name?: string;
    temp_owner_phone?: string;
    created_by?: number;
    clinic_name?: string | null;
}

export interface PetDetail extends PetBasic {
    // Pedigree
    mother?: ParentSimple | null; // ID and name
    father?: ParentSimple | null;
    mother_info?: ParentInfo | null; // Rich preview
    father_info?: ParentInfo | null;

    // History
    active_vets: UserProfile[]; 
    recent_events?: PetEvent[]; 
    
    // Login data (returned only when a patient is created)
    generated_login?: string;
    generated_password?: string;
}

// === PAYLOADS (SENT TO THE BACKEND) ===
// Used in PetForm
export interface PetPayload {
    name: string;
    gender: 'M' | 'F';
    birth_date?: string | null;
    description?: string;
    is_public: boolean;
    
    // Relation IDs
    categories: number[];
    tags: string[]; // Tag slugs are sent
    attributes: { attribute_slug: string; value: string }[];
    
    mother?: number | null; // ID
    father?: number | null; // ID
    
    // Shadow owner
    temp_owner_name?: string;
    temp_owner_phone?: string;
}

// Internal wizard state (usePetForm → PetFormSteps)
export interface PetFormData {
    name: string;
    gender: 'M' | 'F' | '';
    birth_date: string;
    description: string;
    selectedCategoryId: number | null;
    selectedBreedId: number | null;
    tagSlugs: string[];
    attributeValues: Record<string, string>;
    motherId: number | null;
    fatherId: number | null;
    is_public: boolean;
    tempOwnerName: string;
    tempOwnerPhone: string;
}
