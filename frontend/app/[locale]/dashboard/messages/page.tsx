'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
// [NEW] 1. Импортируем хук чата для обновления счетчика
import { useChat } from '@/components/providers/ChatProvider';
import { ChatRoom, ChatMessage } from '@/types/chat';
import { 
    Send, User as UserIcon, Loader2, Paperclip, X, FileText, Image as ImageIcon 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getFullUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
};

// === КОНСТАНТЫ ВАЛИДАЦИИ ===
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
];

export default function MessagesPage() {
  const { user } = useAuth(); 
  // [NEW] 2. Достаем функцию обновления
  const { refreshUnreadCount } = useChat(); 

  const [token, setToken] = useState<string | null>(null);
  
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      setToken(localStorage.getItem('access_token'));
  }, []);

  const { messages, sendMessage, isConnected, setMessages } = useChatWebSocket({
    roomId: selectedRoomId,
    token: token,
  });

  // Загрузка комнат
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/chat/rooms/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        setRooms(Array.isArray(data) ? data : data.results || []);
        setIsLoadingRooms(false);
    })
    .catch(err => console.error(err));
  }, [token]);

  // Загрузка истории при смене комнаты
  useEffect(() => {
    if (!selectedRoomId || !token) return;
    
    setHistoryLoaded(false);
    fetch(`${API_URL}/api/chat/rooms/${selectedRoomId}/messages/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        const msgs = Array.isArray(data) ? data : data.results || [];
        setMessages(msgs.reverse()); 
        setHistoryLoaded(true);
        scrollToBottom();

        // [NEW] 3. Обновляем счетчик непрочитанных, так как мы открыли чат
        refreshUnreadCount();
    })
    .catch(console.error);
  }, [selectedRoomId, token, setMessages, refreshUnreadCount]);

  useEffect(() => {
      scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_FILE_SIZE) {
          alert('Файл слишком большой. Максимум 10 МБ.');
          return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
          alert('Неподдерживаемый формат. Используйте изображения, PDF или Word.');
          return;
      }

      setAttachment(file);
      e.target.value = ''; 
  };

  const removeAttachment = () => {
      setAttachment(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachment) || !isConnected) return;

    let attachmentId = null;

    if (attachment) {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', attachment);
            
            if (selectedRoomId) {
                formData.append('room_id', selectedRoomId.toString());
            } else {
                throw new Error("Не выбрана комната");
            }
            
            const res = await fetch(`${API_URL}/api/chat/attachments/upload/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!res.ok) throw new Error('Ошибка загрузки файла');
            
            const data = await res.json();
            attachmentId = data.id; 
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Не удалось загрузить файл');
            setIsUploading(false);
            return;
        }
        setIsUploading(false);
    }

    sendMessage(inputText, attachmentId); 

    setInputText('');
    setAttachment(null);
  };

  const activeRoom = rooms.find(r => r.id === selectedRoomId);
  const interlocutor = activeRoom 
      ? (activeRoom.vet?.id === user?.id ? activeRoom.owner : activeRoom.vet)
      : null;

  return (
    <div className="flex h-[calc(100vh-6rem)] bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      
      {/* SIDEBAR: ROOMS */}
      <div className="w-1/3 border-r border-gray-100 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
            <h2 className="font-bold text-lg text-gray-800">Сообщения</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoadingRooms ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
            ) : rooms.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">Нет активных чатов</div>
            ) : (
                rooms.map(room => {
                    const otherUser = room.vet?.id === user?.id ? room.owner : room.vet;
                    return (
                        <div 
                            key={room.id}
                            onClick={() => setSelectedRoomId(room.id)}
                            className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-3 border-b border-gray-100 ${selectedRoomId === room.id ? 'bg-white border-l-4 border-l-blue-500 shadow-sm' : ''}`}
                        >
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-300">
                                {otherUser?.avatar ? (
                                    <img src={getFullUrl(otherUser.avatar)!} className="w-full h-full object-cover" />
                                ) : (
                                    <UserIcon className="w-full h-full p-2 text-gray-400" />
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-bold text-gray-900 truncate text-sm">
                                    {otherUser?.first_name || otherUser?.username || 'Пользователь'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{room.last_message?.text || 'Нет сообщений'}</p>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedRoomId ? (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 shadow-sm z-10 bg-white">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200">
                    {(interlocutor?.first_name || interlocutor?.username || '?')[0].toUpperCase()}
                </div>
                <h3 className="font-bold text-gray-800">
                    {interlocutor?.first_name || interlocutor?.username}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar">
              {!historyLoaded ? (
                 <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender === user?.id;
                  return (
                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${
                          isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                      }`}>
                        
                        {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                        
                        {msg.attachment && (
                            <div className="mt-2 p-1 bg-black/5 rounded-lg overflow-hidden">
                                {['jpg','png','jpeg','webp','gif'].some(ext => msg.attachment?.toLowerCase().endsWith(ext)) ? (
                                    // [NEW] 4. Кликабельная картинка
                                    <a 
                                      href={getFullUrl(msg.attachment)!} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="block cursor-zoom-in"
                                    >
                                        <img 
                                            src={getFullUrl(msg.attachment)!} 
                                            alt="Вложение"
                                            className="rounded-md max-h-60 w-full object-cover hover:opacity-95 transition" 
                                        />
                                    </a>
                                ) : (
                                    <a 
                                      href={getFullUrl(msg.attachment)!} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className={`flex items-center gap-2 text-xs font-bold px-2 py-1.5 rounded hover:underline ${isMe ? 'text-white' : 'text-blue-600'}`}
                                    >
                                        <FileText size={16} />
                                        Скачать файл
                                    </a>
                                )}
                            </div>
                        )}

                        <span className={`text-[10px] mt-1 block text-right opacity-70`}>
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-100">
                {attachment && (
                    <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-100 p-2 rounded-xl w-fit animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm">
                            {attachment.type.startsWith('image') ? <ImageIcon size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="max-w-[200px]">
                            <p className="text-xs font-bold text-gray-700 truncate">{attachment.name}</p>
                            <p className="text-[10px] text-gray-500">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button onClick={removeAttachment} className="p-1 hover:bg-blue-200 rounded-full text-blue-600 transition">
                            <X size={14} />
                        </button>
                    </div>
                )}

              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <label className="p-3 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors mb-0.5">
                    <Paperclip size={20} />
                    <input 
                        type="file" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                    />
                </label>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                      if(e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                      }
                  }}
                  placeholder="Напишите сообщение..."
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-gray-50 text-sm resize-none custom-scrollbar"
                  rows={1}
                  style={{ maxHeight: '100px' }}
                  disabled={!isConnected || isUploading}
                />
                
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !attachment) || !isConnected || isUploading}
                  className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-200 mb-0.5"
                >
                  {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <UserIcon className="w-10 h-10 opacity-20" />
            </div>
            <p className="font-medium">Выберите чат</p>
          </div>
        )}
      </div>
    </div>
  );
}