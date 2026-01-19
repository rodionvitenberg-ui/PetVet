// types/breeding.ts
import { PetBasic } from './pet';

export interface HeatCycle {
    id: number;
    pet: number; // ID питомца
    start_date: string;
    end_date?: string | null;
    notes?: string;
}

export interface Mating {
    id: number;
    dam: number; // Мать ID
    dam_name?: string;
    sire: number; // Отец ID
    sire_name?: string;
    date: string;
    is_successful: boolean;
    cycle?: number | null; // ID цикла
}

export interface OffspringSimple {
    id: number;
    name: string;
    slug: string;
}

export interface Litter {
    id: number;
    litter_code: string; // "Litter A"
    birth_date: string;
    
    dam: number;
    dam_name?: string;
    
    sire: number;
    sire_name?: string;
    
    born_alive: number;
    born_dead: number;
    
    offspring: number[]; // IDs
    offspring_info?: OffspringSimple[]; // Для отображения
}