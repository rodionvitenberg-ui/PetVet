export interface SystemPrompt {
  id: number;
  name: string;
}

export interface PetBasicForChat {
  id: number;
  name: string;
  categories: Array<{ id: number; name: string }>;
  images: Array<{ id: number; image: string | null }>;
}

export interface AIChatSession {
  id: number;
  pet: PetBasicForChat;
  title: string;
  system_prompt_id?: number;
  last_message: {
    role: 'user' | 'assistant';
    content_preview: string;
    created_at: string;
  } | null;
  messages_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIChatMessage {
  id: number;
  session: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}