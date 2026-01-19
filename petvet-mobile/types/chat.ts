import { PetBasic } from './pet';

export interface UserShort {
  id: number;
  email: string;
  username: string;
  avatar?: string | null;
  first_name?: string;
  last_name?: string;
}

export interface ChatRoom {
  id: number;
  pet: PetBasic;
  vet: UserShort;
  owner: UserShort;
  last_message?: ChatMessage;
  updated_at: string;
  is_active: boolean;
}

export interface ChatMessage {
  id: number;
  room: number;
  sender: number; // ID пользователя (число)
  sender_name?: string;
  sender_avatar?: string | null;
  text: string;
  attachment?: string | null; // URL или путь к файлу
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}