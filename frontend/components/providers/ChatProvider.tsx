'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { chatService } from '@/services/chat';
import { ChatRoom } from '@/types/chat';

interface ChatContextType {
  unreadCount: number;
  refreshUnreadCount: () => void; // Эту функцию мы будем вызывать из чата
}

const ChatContext = createContext<ChatContextType>({
  unreadCount: 0,
  refreshUnreadCount: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuth } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadChats = useCallback(async () => {
    if (!isAuth || !user) {
        setUnreadCount(0);
        return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      // Получаем список чатов (предполагается, что API сортирует их и отдает last_message)
      const rooms: ChatRoom[] = await chatService.getMyChats(token);
      
      // Считаем те, где последнее сообщение НЕ прочитано и отправлено НЕ нами
      const count = rooms.filter(room => 
        room.last_message && 
        !room.last_message.is_read && 
        room.last_message.sender !== user.id
      ).length;

      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to update unread count", error);
    }
  }, [isAuth, user]);

  // Первичная загрузка + Поллинг каждые 30 секунд
  useEffect(() => {
    fetchUnreadChats();
    const interval = setInterval(fetchUnreadChats, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadChats]);

  return (
    <ChatContext.Provider value={{ unreadCount, refreshUnreadCount: fetchUnreadChats }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);