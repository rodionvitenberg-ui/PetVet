'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import NotificationSettingsModal from '@/components/notifications/NotificationsSettingsModal'; 
import { 
    Bell, 
    Info, 
    AlertTriangle, 
    Calendar, 
    Stethoscope,
    Loader2,
    Settings,
    X // <--- Добавили иконку крестика для удаления
} from 'lucide-react';

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
      actions?: NotificationAction[];
      link?: string; 
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Добавляем пропс onClose, чтобы родитель мог закрыть дропдаун, 
// если он управляется состоянием снаружи
interface NotificationsDropdownProps {
    onClose?: () => void;
}

export default function NotificationsDropdown({ onClose }: NotificationsDropdownProps) {
  const router = useRouter(); 
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        
        // --- 1. СОРТИРОВКА: Самые свежие (с бОльшим ID) выводим на самый верх ---
        const sortedData = data.sort((a: Notification, b: Notification) => b.id - a.id);
        
        setNotifications(sortedData);
        setUnreadCount(sortedData.filter((n: Notification) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: number) => {
    const token = localStorage.getItem('access_token');
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await fetch(`${API_URL}/api/notifications/${id}/mark_read/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
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

  // --- 2. ФУНКЦИЯ УДАЛЕНИЯ (УБРАТЬ УВЕДОМЛЕНИЕ) ---
  const deleteNotification = async (id: number, e: React.MouseEvent) => {
      e.stopPropagation(); // Чтобы не сработал клик по самому уведомлению
      const token = localStorage.getItem('access_token');
      
      // Оптимистичное удаление из списка мгновенно
      setNotifications(prev => {
          const nextList = prev.filter(n => n.id !== id);
          setUnreadCount(nextList.filter(n => !n.is_read).length);
          return nextList;
      });

      try {
          // Отправляем запрос на удаление в БД
          await fetch(`${API_URL}/api/notifications/${id}/`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
          });
      } catch (error) {
          console.error("Error deleting notification:", error);
      }
  };

  const getNotificationLink = (note: Notification): string | null => {
      if (note.metadata?.link) {
          return note.metadata.link;
      }
      
      if (note.linked_object) {
          const { type, id } = note.linked_object;
          switch (type) {
              case 'event':
                  // Теперь ссылка ведет с конкретным параметром ?eventId=
                  // Это заставит роутер сработать, даже если мы уже на /planboard
                  return `/planboard?eventId=${id}`; 
              case 'pet':
                  return `/planboard/pets/${id}`;
              case 'invoice':
                  return `/billing/invoices/${id}`;
              default:
                  return null;
          }
      }
      return null;
  };

  // --- 3. ОБРАБОТЧИК КЛИКА С ЗАКРЫТИЕМ ДРОПДАУНА ---
  const handleItemClick = (note: Notification) => {
      if (!note.is_read) {
          markAsRead(note.id);
      }

      const targetLink = getNotificationLink(note);
      if (targetLink) {
          router.push(targetLink);
      }

      // Закрываем дропдаун
      if (onClose) onClose();
      // Хак на случай, если дропдаун слушает клики вне своей области (click outside)
      document.body.click(); 
  };

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'medical': return <Stethoscope className="text-primary" size={20} />;
      case 'reminder': return <Calendar className="text-accent" size={20} />;
      case 'action': return <AlertTriangle className="text-destructive" size={20} />;
      default: return <Info className="text-muted-foreground" size={20} />;
    }
  };

  return (
    <div className="w-[300px] sm:w-[360px] bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
      
      <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/80 backdrop-blur-sm">
        <h3 className="font-bold text-foreground text-sm">Notifications</h3>
        {unreadCount > 0 && (
           <button 
             onClick={markAllRead}
             disabled={loading}
             className="text-xs text-primary hover:text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
           >
             {loading && <Loader2 size={10} className="animate-spin"/>}
             Mark all as read
           </button>
        )}
        <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 hover:bg-muted rounded-full text-muted-foreground hover:text-muted-foreground transition"
            title="Notification Settings"
        >
            <Settings size={16} />
        </button>
      </div>
      

      <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
        {notifications.length === 0 ? (
            <div className="py-12 px-6 text-center text-muted-foreground">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No new notifications</p>
            </div>
        ) : (
            notifications.map((note) => {
             const targetLink = getNotificationLink(note);
             const isClickable = !!targetLink;

              return (
                <div 
                  key={note.id} 
                  onClick={() => handleItemClick(note)} 
                  className={`
                    p-4 border-b border-border flex gap-3 group relative transition
                    ${!note.is_read ? 'bg-primary/10' : 'hover:bg-muted'}
                    ${isClickable ? 'cursor-pointer active:bg-primary/10' : ''} 
                  `}
                >
                  <div className="mt-1 flex-shrink-0 bg-card p-2 rounded-full shadow-sm border border-border h-fit">
                      {getIcon(note.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                          <p className={`text-sm ${!note.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                              {note.title}
                          </p>
                          
                          {/* Панель кнопочек (Прочитано и Удалить) */}
                          <div className="flex items-center gap-1">
                              {!note.is_read && (
                                  <button 
                                      onClick={(e) => { 
                                          e.stopPropagation(); 
                                          markAsRead(note.id); 
                                      }}
                                      className="text-primary/70 hover:text-primary opacity-0 group-hover:opacity-100 transition p-1"
                                      title="Mark as read"
                                  >
                                      <div className="w-2 h-2 rounded-full bg-primary" />
                                  </button>
                              )}
                              
                              <button 
                                  onClick={(e) => deleteNotification(note.id, e)}
                                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition p-1"
                                  title="Delete notification"
                              >
                                  <X size={14} />
                              </button>
                          </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-3">
                          {note.message}
                      </p>
                      
                      {note.metadata?.actions && note.metadata.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 mb-1">
                              {note.metadata.actions.map((act, idx) => (
                                  <button 
                                      key={idx}
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          console.log('Action clicked:', act.api_call);
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm
                                          ${act.style === 'danger' 
                                              ? 'bg-destructive/10 text-destructive hover:bg-destructive/10 border border-destructive/20' 
                                              : 'bg-primary/10 text-primary hover:bg-primary/10 border border-primary/15'
                                          }`}
                                  >
                                      {act.label}
                                  </button>
                              ))}
                          </div>
                      )}

                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-2">
                          {note.created_at_formatted}
                          {isClickable && <span className="text-primary/70 opacity-0 group-hover:opacity-100 transition">➔</span>}
                      </p>
                  </div>
                </div>
              );
            })
        )}
      </div>
      {isSettingsOpen && (
        <NotificationSettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
        />)}
    </div>
  );
}