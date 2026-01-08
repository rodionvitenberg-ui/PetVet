'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    Bell, 
    Check, 
    Info, 
    AlertTriangle, 
    Calendar, 
    Stethoscope,
    Loader2
} from 'lucide-react';

// Типизация уведомления (соответствует бэкенду)
interface NotificationAction {
    label: string;
    style?: 'primary' | 'danger' | 'default';
    api_call?: string;
    type?: 'button' | 'link';
}

interface Notification {
  id: number;
  category: 'system' | 'reminder' | 'medical' | 'action';
  title: string;
  message: string;
  is_read: boolean;
  created_at_formatted: string;
  linked_object?: { type: string; id: number };
  metadata?: { 
      actions?: NotificationAction[] 
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- 1. Загрузка данных ---
  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Ошибка загрузки уведомлений:", error);
    }
  };

  // Загружаем при маунте и открытии
  useEffect(() => {
    fetchNotifications();
    // Простой поллинг раз в 60 сек для актуализации (пока нет сокетов)
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- 2. Действия ---
  const markAsRead = async (id: number) => {
    const token = localStorage.getItem('access_token');
    try {
      await fetch(`${API_URL}/api/notifications/${id}/mark_read/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Оптимистичное обновление UI
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
      const token = localStorage.getItem('access_token');
      setLoading(true);
      try {
        await fetch(`${API_URL}/api/notifications/mark_all_read/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        await fetchNotifications();
      } finally {
          setLoading(false);
      }
  };

  // Закрытие при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Иконка в зависимости от категории
  const getIcon = (cat: string) => {
    switch (cat) {
      case 'medical': return <Stethoscope className="text-blue-500" size={20} />;
      case 'reminder': return <Calendar className="text-orange-500" size={20} />;
      case 'action': return <AlertTriangle className="text-red-500" size={20} />;
      default: return <Info className="text-gray-400" size={20} />;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Кнопка Колокольчик */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition outline-none"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Выпадающее меню */}
      {isOpen && (
        <div className="absolute right-[-60px] sm:right-0 mt-3 w-[300px] sm:w-[360px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          
          {/* Шапка дропдауна */}
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-sm">
            <h3 className="font-bold text-gray-700 text-sm">Уведомления</h3>
            {unreadCount > 0 && (
               <button 
                 onClick={markAllRead}
                 disabled={loading}
                 className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 disabled:opacity-50"
               >
                 {loading && <Loader2 size={10} className="animate-spin"/>}
                 Прочитать все
               </button>
            )}
          </div>

          {/* Список */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
            {notifications.length === 0 ? (
                <div className="py-12 px-6 text-center text-gray-400">
                    <Bell size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Нет новых уведомлений</p>
                </div>
            ) : (
                notifications.map((note) => (
                  <div 
                    key={note.id} 
                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition flex gap-3 group relative ${!note.is_read ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="mt-1 flex-shrink-0 bg-white p-2 rounded-full shadow-sm border border-gray-100 h-fit">
                        {getIcon(note.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <p className={`text-sm ${!note.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {note.title}
                            </p>
                            {!note.is_read && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); markAsRead(note.id); }}
                                    className="text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition p-1"
                                    title="Пометить как прочитанное"
                                >
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                </button>
                            )}
                        </div>
                        
                        <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-3">
                            {note.message}
                        </p>
                        
                        {/* Кнопки действий (из Metadata) */}
                        {note.metadata?.actions && note.metadata.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2 mb-1">
                                {note.metadata.actions.map((act, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => console.log('Action clicked:', act.api_call)} // Тут будет логика вызова API
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm
                                            ${act.style === 'danger' 
                                                ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100' 
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'
                                            }`}
                                    >
                                        {act.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <p className="text-[10px] text-gray-400 font-medium">
                            {note.created_at_formatted}
                        </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}