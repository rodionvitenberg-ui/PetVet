// frontend/services/chat.ts

// 1. Убираем /api из дефолтного значения, чтобы не путаться. Пусть это будет просто хост.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// 2. Функция, которая гарантирует правильный путь
const getEndpoint = (path: string) => {
    // Если BASE_URL уже содержит /api (например, задан в env), не дублируем
    const baseUrl = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;
    return `${baseUrl}${path}`;
};

interface GetHistoryParams {
  roomId: number;
  page?: number;
}

export const chatService = {
  async getMyChats(token: string) {
    const res = await fetch(getEndpoint('/chat/rooms/'), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch chats: ${res.status}`);
    return res.json();
  },

  async getMessages(token: string, { roomId, page = 1 }: GetHistoryParams) {
    const res = await fetch(getEndpoint(`/chat/messages/?room_id=${roomId}&page=${page}`), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
    return res.json();
  }
};