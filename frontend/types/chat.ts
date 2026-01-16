import { PetBasic } from './pet'; // Предполагаю, что тип Pet уже есть, если нет - используй any или создай

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
  sender: number; // ID пользователя
  sender_name?: string; // Для удобства отображения
  text: string;
  attachment?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}