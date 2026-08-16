// types/event.ts

// Event category types (match backend choices in pets/models.py EventType.CATEGORY_CHOICES)
export type EventCategory = 'medical' | 'reproduction' | 'show' | 'care' | 'surgery' | 'parasite' | 'other';

export type EventStatus = 'planned' | 'completed' | 'missed';

// JSON schema for dynamic event fields (received from the backend in EventType)
export interface EventSchemaField {
    name: string; // JSON key (e.g. "judge")
    label: string; // Display label (e.g. "Judge")
    type: 'text' | 'number' | 'date' | 'select' | 'boolean';
    options?: string[]; // for select fields
    required?: boolean;
}

export interface EventSchema {
    fields?: EventSchemaField[];
}

// Event type (reference/dictionary entry)
export interface EventType {
    id: number;
    name: string;
    slug: string;
    category: EventCategory;
    icon?: string | null;
    default_schema?: EventSchema; // JSON schema
    is_universal: boolean;
    is_custom: boolean;
}

export interface PetEventAttachment {
    id: number;
    file: string;
    created_at: string;
}

// Minimal pet representation inside an event (pet_info on the backend)
export interface PetShortInEvent {
    id: number;
    name: string;
    avatar?: string | null;
    owner_name?: string | null;
}

export interface PetEventCreator {
    id: number;
    name: string;
    is_vet: boolean;
    clinic_name?: string | null;
    avatar?: string | null;
}

// MAIN EVENT MODEL
export interface PetEvent {
    id: number;
    title: string;
    description?: string;
    date: string;       // YYYY-MM-DD
    next_date?: string | null;

    // Type is now an object, not a string!
    event_type: EventType;
    event_type_display?: string; // fallback

    status: EventStatus;

    // Guest or pet (one of them is required on the backend)
    guest_name?: string | null;
    guest_phone?: string | null;
    admin_notes?: string | null;

    // Dynamic data (Weight, Judge, Rank...)
    data?: Record<string, unknown>;

    // The server returns pet as ID + pet_info as an object
    pet: number | null;
    pet_info?: PetShortInEvent | null;

    attachments?: PetEventAttachment[];

    is_verified: boolean;
    created_at: string;
    created_by_info?: PetEventCreator;
}

// Payload for creating/editing
export interface PetEventPayload {
    pet: number; // Pet ID
    event_type_id: number; // Type ID
    title: string;
    description?: string;
    date: string;
    status: EventStatus;
    next_date?: string | null;

    // JSON data
    data?: Record<string, unknown>;
}