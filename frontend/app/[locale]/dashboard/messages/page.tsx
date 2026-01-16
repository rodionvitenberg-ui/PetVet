'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { chatService } from '@/services/chat';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { ChatRoom, ChatMessage, UserShort, PaginatedResponse } from '@/types/chat';
import { Send, User as UserIcon, Loader2 } from 'lucide-react';

// Хелпер для склейки URL картинки
const getFullUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  // Берем хост из env или хардкод для локалки
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  return `${baseUrl}${path}`;
};

export default function MessagesPage() {
  const { user } = useAuth(); 
  const [token, setToken] = useState<string | null>(null);
  
  // Состояния
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');

  // Используем реф не на пустой див, а на сам контейнер сообщений для управления скроллом
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Получение токена
  useEffect(() => {
    const storedToken = 
        localStorage.getItem('access') || 
        localStorage.getItem('access_token') || 
        localStorage.getItem('token');
    
    if (storedToken) {
        setToken(storedToken);
    } else {
        console.warn("Auth token is missing in localStorage");
        setIsLoadingRooms(false); 
    }
  }, []);

  // 2. Загрузка комнат (Исправлен TS)
  useEffect(() => {
    if (token) {
      chatService.getMyChats(token)
        .then((data: ChatRoom[]) => { // <--- Явно указываем тип
          setRooms(data);
          setIsLoadingRooms(false);
        })
        .catch((err: any) => { // <--- Явно указываем тип ошибки
          console.error("Failed to load chats", err);
          setIsLoadingRooms(false);
        });
    }
  }, [token]);

  // 3. Загрузка истории
  useEffect(() => {
    if (selectedRoomId && token) {
      setIsLoadingMessages(true);
      setMessages([]); 
      
      chatService.getMessages(token, { roomId: selectedRoomId })
        .then((data: PaginatedResponse<ChatMessage> | ChatMessage[]) => {
          const msgs = 'results' in data ? data.results : data;
          setMessages(msgs.reverse());
          setIsLoadingMessages(false);
          scrollToBottom(true); // Мгновенный скролл при открытии
        })
        .catch((err: any) => {
            console.error(err);
            setIsLoadingMessages(false);
        });
    }
  }, [selectedRoomId, token]);

  // 4. WebSocket
  const { sendMessage, isConnected } = useChatWebSocket({
    roomId: selectedRoomId,
    token: token,
    onNewMessage: (msg) => {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom(false); // Плавный скролл при новом сообщении
      
      // Обновляем список чатов (поднимаем активный наверх)
      setRooms(prev => prev.map(room => {
        if (room.id === msg.room) {
           return { ...room, updated_at: msg.created_at };
        }
        return room;
      }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    }
  });

  // Улучшенная функция скролла (без прыжков страницы)
  const scrollToBottom = (instant: boolean = false) => {
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current;
        // Устанавливаем позицию скролла в самый низ
        scrollContainerRef.current.scrollTo({
            top: scrollHeight - clientHeight,
            behavior: instant ? 'auto' : 'smooth'
        });
      }
    }, 100);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  const getInterlocutor = (room: ChatRoom): UserShort => {
    if (!user) {
        return { 
            id: 0, 
            username: 'Loading...', 
            email: '', 
            first_name: '', 
            last_name: '',
            avatar: null 
        }; 
    }
    // @ts-ignore
    const isMeOwner = (user.id && user.id === room.owner.id) || user.email === room.owner.email; 
    return isMeOwner ? room.vet : room.owner;
  };

  return (
    <div className="flex h-[calc(100vh-100px)] bg-gray-50 border rounded-lg overflow-hidden shadow-sm mt-4">
      
      {/* ЛЕВАЯ КОЛОНКА: СПИСОК */}
      <div className="w-1/3 border-r bg-white flex flex-col">
        <div className="p-4 border-b bg-gray-100 font-semibold text-gray-700">
          Ваши сообщения
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoadingRooms ? (
            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
          ) : rooms.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
                {token ? "Нет активных чатов" : "Загрузка..."}
            </div>
          ) : (
            rooms.map((room) => {
              const interlocutor = getInterlocutor(room);
              const avatarUrl = getFullUrl(interlocutor.avatar); // Обработка URL аватара

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                    selectedRoomId === room.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <UserIcon className="text-gray-400 w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                        {interlocutor.first_name 
                            ? `${interlocutor.first_name} ${interlocutor.last_name || ''}` 
                            : interlocutor.username}
                    </div>
                    <div className="text-xs text-gray-500">
                        Питомец: <span className="text-blue-600">{room.pet.name}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА: ОКНО ЧАТА */}
      <div className="w-2/3 flex flex-col bg-gray-50">
        {selectedRoomId ? (
          <>
            <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
              <span className="font-semibold text-gray-800">
                Чат #{selectedRoomId} 
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isConnected ? 'Онлайн' : 'Оффлайн'}
                </span>
              </span>
            </div>

            {/* Контейнер сообщений с ref для скролла */}
            <div 
                ref={scrollContainerRef} 
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
              {isLoadingMessages ? (
                 <div className="flex justify-center mt-10"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>
              ) : (
                messages.map((msg) => {
                  // @ts-ignore
                  const isMyMessage = user?.id ? msg.sender === user.id : msg.sender_name === user?.username;
                  
                  return (
                    <div 
                        key={msg.id} 
                        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                            isMyMessage 
                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                : 'bg-white text-gray-800 border rounded-tl-none'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span className={`text-[10px] block text-right mt-1 opacity-70`}>
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-white border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Напишите сообщение..."
                  className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  disabled={!isConnected || !inputText.trim()}
                  className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <UserIcon className="w-16 h-16 mb-4 opacity-20" />
            <p>Выберите собеседника слева, чтобы начать общение</p>
          </div>
        )}
      </div>
    </div>
  );
}