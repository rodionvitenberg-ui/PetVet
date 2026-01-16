'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation'; 
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAppMode } from '@/components/providers/AppModeProvider';
import { 
  Menu,
  Globe
} from 'lucide-react';
import NotificationsDropdown from './dashboard/NotificationsDropdown';

// Импорт сервисов и типов для чата
import { chatService } from '@/services/chat';
import { ChatRoom } from '@/types/chat';

// Импорт кастомных анимированных иконок
import { BoneIcon } from '@/components/ui/bone';
import { BookTextIcon } from '@/components/ui/book-text';
import { MapPinIcon } from '@/components/ui/map-pin';
import { HomeIcon } from '@/components/ui/home';
import { StethoscopeIcon } from '@/components/ui/stethoscope';
import { BellIcon } from '@/components/ui/bell';
// Предполагаемые импорты новых иконок (согласно вашему описанию)
import { MessageCircleIcon } from '@/components/ui/message-circle';
import { MessageCircleMoreIcon } from '@/components/ui/message-circle-more';

type ActiveMenu = 'notifications' | 'burger' | null;

export default function Header() {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const { isAuth, logout, user } = useAuth(); // Добавили user для проверки отправителя
  
  const { isVetMode } = useAppMode(); 
  
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const [unreadCount, setUnreadCount] = useState(0); // Счетчик непрочитанных диалогов
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

  const toggleMenu = (menu: ActiveMenu) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  // Эффект для получения количества непрочитанных сообщений
  useEffect(() => {
    const fetchUnreadChats = async () => {
      if (!isAuth || !user) return;

      const token = localStorage.getItem('access_token');
      if (!token) return;

      try {
        const rooms: ChatRoom[] = await chatService.getMyChats(token);
        
        // Считаем комнаты, где последнее сообщение не прочитано и отправлено НЕ нами
        const count = rooms.filter(room => 
          room.last_message && 
          !room.last_message.is_read && 
          room.last_message.sender !== user.id
        ).length;

        setUnreadCount(count);
      } catch (error) {
        console.error("Failed to fetch chats for header badge", error);
      }
    };

    fetchUnreadChats();

    // Можно добавить поллинг (раз в 30 сек) или обновлять при смене страницы
    const interval = setInterval(fetchUnreadChats, 30000);
    return () => clearInterval(interval);

  }, [isAuth, user, pathname]); // Обновляем также при смене страницы (pathname)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 bg-gray-100 w-full z-50 border-b border-gray-200 h-20">
      <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between text-[#222222]">
        
        {/* 1. ЛЕВАЯ ЧАСТЬ (Логотип + Текст снизу) */}
        <div className="flex items-center flex-1 select-none">
           <div className="flex flex-col items-center justify-center leading-none">
              <Image 
                src="/logo1.png" 
                alt="PetVet Logo" 
                width={75} 
                height={75} 
                className="object-contain"
                priority
              />
           </div>
        </div>

        {/* 2. ЦЕНТР (Навигация) */}
        <div className="hidden md:flex items-center justify-center h-full gap-8">
          
          <Link 
            href="/"
            className={`
              h-full flex items-center gap-2 px-1 relative transition-all cursor-pointer group
              ${isActive('/') 
                ? 'text-black opacity-100 border-b-2 border-black' 
                : 'text-gray-500 hover:opacity-100 hover:text-primary border-b-2 border-transparent'
              }
            `}
          >
            <div className="p-2">
               <HomeIcon size={24} />
            </div>
            <span className="text-sm font-medium">{t('home')}</span>
          </Link>

          <Link 
            href="/dashboard"
            className={`
              h-full flex items-center gap-2 px-1 relative transition-all cursor-pointer group
              ${isActive('/dashboard') 
                ? 'text-black opacity-100 border-b-2 border-black' 
                : 'text-gray-500 hover:opacity-100 hover:text-primary border-b-2 border-transparent'
              }
            `}
          >
            <div className="p-2">
               <BoneIcon size={28} />
            </div>
            <span className="text-sm font-medium">{t('dashboard')}</span>
          </Link>

          <Link 
            href="/planboard"
            className={`
              h-full flex items-center gap-2 px-1 relative group transition-all cursor-pointer
              ${isActive('/planboard') 
                ? 'text-black opacity-100 border-b-2 border-black' 
                : 'text-gray-500 hover:opacity-100 hover:text-primary border-b-2 border-transparent'
              }
            `}
          >
            <div className="p-2">
               <BookTextIcon size={24} />
            </div>
            <span className="text-sm font-medium">{t('calendar')}</span>
          </Link>

          <Link 
            href="/find-vet"
            className={`
              h-full flex items-center gap-2 px-1 relative group transition-all cursor-pointer
              ${isActive('/find-vet') 
                ? 'text-black opacity-100 border-b-2 border-black' 
                : 'text-gray-500 hover:opacity-100 hover:text-primary border-b-2 border-transparent'
              }
            `}
          >
            <div className="p-2">
               <MapPinIcon size={24} />
            </div>
            <span className="text-sm font-medium">{t('find_doctor')}</span>
          </Link>
        </div>

        {/* 3. ПРАВАЯ ЧАСТЬ */}
        <div className="flex items-center justify-end gap-2 flex-1 relative" ref={menuRef}>
          
          {isAuth ? (
              <div className="flex items-center gap-1">
                
                {/* === КНОПКА ЧАТА === */}
                <Link
                  href="/dashboard/messages"
                  className={`
                    p-2 rounded-full transition duration-200 flex items-center justify-center outline-none relative
                    ${isActive('/dashboard/messages')
                        ? 'text-primary bg-gray-100'
                        : 'text-gray-600 hover:text-primary hover:bg-gray-100'
                    }
                  `}
                >
                   {/* Логика смены иконки: если есть непрочитанные - MessageCircleMore, иначе MessageCircle */}
                   {unreadCount > 0 ? (
                      <MessageCircleMoreIcon size={24} />
                   ) : (
                      <MessageCircleIcon size={24} />
                   )}

                   {/* Счетчик сообщений (Badge) */}
                   {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                   )}
                </Link>
                {/* ================= */}

                {/* Кнопка-триггер: Анимированный колокольчик */}
                <div className="relative">
                    <button 
                    onClick={() => toggleMenu('notifications')}
                    className={`
                        p-2 rounded-full transition duration-200 flex items-center justify-center outline-none
                        ${activeMenu === 'notifications' 
                            ? 'text-primary bg-gray-100' 
                            : 'text-gray-600 hover:text-primary hover:bg-gray-100'
                        }
                    `}
                    >
                    <BellIcon size={24} />
                    </button>
                    
                    {/* Окно уведомлений */}
                    {activeMenu === 'notifications' && (
                    <div className="absolute top-full right-0 mt-2 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <NotificationsDropdown />
                    </div>
                    )}
                </div>
              </div>
            ) : (
              <button className="hover:bg-gray-300 p-2 rounded-full transition cursor-pointer">
                <Globe size={18} className="text-black" />
              </button>
            )}

          {/* Кнопка Бургер-меню */}
          <button 
            onClick={() => toggleMenu('burger')}
            className={`
              flex items-center justify-center border rounded-full p-2.5 transition cursor-pointer ml-1 bg-white outline-none
              ${activeMenu === 'burger' 
                  ? 'border-primary shadow-md text-primary' 
                  : 'border-gray-300 hover:shadow-md text-black'
              }
            `}
          >
            <Menu size={20} />
          </button>

          {/* Выпадающее Бургер-меню */}
          {activeMenu === 'burger' && (
            <div className="absolute top-full right-0 mt-2 w-[320px] bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.15)] border border-gray-100 py-2 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 text-left origin-top-right">
              
              {!isAuth ? (
                <>
                  <Link 
                    href="/login" 
                    onClick={closeMenu}
                    className="block px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-100 transition"
                  >
                    {t('login_signup')}
                  </Link>
                </>
              ) : (
                <>
                   <Link 
                    href="/profile" 
                    onClick={closeMenu}
                    className="block px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-100 transition"
                   >
                    {t('profile')}
                  </Link>
                  <Link 
                    href="/pets/create" 
                    onClick={closeMenu}
                    className="block px-4 py-3 text-sm font-normal text-gray-600 hover:bg-gray-100 transition border-b border-gray-100"
                  >
                    {t('add_pet')}
                  </Link>
                </>
              )}

              <div className="py-2">
                <Link 
                    href="/become-vet" 
                    onClick={closeMenu}
                    className="block px-4 py-3 hover:bg-gray-100 transition group"
                >
                   <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="text-sm font-bold text-gray-800 mb-0.5">{t('become_vet')}</div>
                        <div className="text-xs text-gray-500 font-normal leading-snug">
                            {t('become_vet_desc')}
                        </div>
                      </div>
                      <div className="text-gray-500 group-hover:text-primary transition flex-shrink-0">
                        <StethoscopeIcon size={28} />
                      </div>
                   </div>
                </Link>
              </div>

              {/* Мобильное меню */}
              <div className="md:hidden border-t border-gray-100 py-2">
                  <Link 
                    href="/" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition text-sm text-gray-700 group"
                  >
                    <div className="text-gray-500 group-hover:text-primary transition">
                        <HomeIcon size={24} />
                    </div>
                    <span>{t('home')}</span>
                 </Link>
                 <Link 
                    href="/dashboard" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition text-sm text-gray-700 group"
                 >
                    <div className="text-gray-500 group-hover:text-primary transition">
                        <BoneIcon size={24} />
                    </div>
                    <span>{t('dashboard')}</span>
                 </Link>
                 <Link 
                    href="/planboard" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition text-sm text-gray-700 group"
                 >
                    <div className="text-gray-500 group-hover:text-primary transition">
                        <BookTextIcon size={24} />
                    </div>
                    <span>{t('calendar')}</span>
                 </Link>
                 <Link 
                    href="/find-vet" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition text-sm text-gray-700 group"
                 >
                    <div className="text-gray-500 group-hover:text-primary transition">
                        <MapPinIcon size={24} />
                    </div>
                    <span>{t('find_doctor')}</span>
                 </Link>
              </div>

              <div className="border-t border-gray-100 py-2">
                <Link 
                    href="/help" 
                    onClick={closeMenu}
                    className="block px-4 py-3 text-sm text-gray-600 hover:bg-gray-100 transition"
                >
                  {t('help_center')}
                </Link>
                {isAuth && (
                    <button 
                        onClick={() => {
                            closeMenu();
                            logout();
                        }}
                        className="block w-full text-left px-4 py-3 text-sm text-gray-600 hover:bg-gray-100 transition"
                    >
                    {t('logout')}
                    </button>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </header>
  );
}