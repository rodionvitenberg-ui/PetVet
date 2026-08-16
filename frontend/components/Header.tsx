'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation'; 
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAppMode } from '@/components/providers/AppModeProvider';
import { useChat } from '@/components/providers/ChatProvider'; 
import { 
  Menu,
  Globe
} from 'lucide-react';
import NotificationsDropdown from './dashboard/NotificationsDropdown';
import ThemeToggle from './ThemeToggle';

// Импорт кастомных анимированных иконок
import { BoneIcon } from '@/components/ui/bone';
import { BookTextIcon } from '@/components/ui/book-text';
import { MapPinIcon } from '@/components/ui/map-pin';
import { HomeIcon } from '@/components/ui/home';
import { StethoscopeIcon } from '@/components/ui/stethoscope';
import { BellIcon } from '@/components/ui/bell';
import { MessageCircleIcon } from '@/components/ui/message-circle';
import { MessageCircleMoreIcon } from '@/components/ui/message-circle-more';
// [NEW] Импорт новой иконки календаря
import { CalendarDaysIcon } from '@/components/ui/calendar-days';

type ActiveMenu = 'notifications' | 'burger' | null;

export default function Header() {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const { isAuth, logout } = useAuth();
  const { isVetMode } = useAppMode(); 
  
  const { unreadCount } = useChat();
  
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

  const toggleMenu = (menu: ActiveMenu) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

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
    <header className="fixed top-0 bg-background w-full z-50 border-b border-border min-h-16 md:min-h-20">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between text-foreground">
        
        <Link href="/" className="flex items-center flex-1 select-none">
           <div className="flex flex-col items-center justify-center leading-none">
              <Image 
                src="/logo1.png" 
                alt="PetVet Logo" 
                width={60} 
                height={60} 
                className="object-contain w-[70px] h-[70px] md:w-[80px] md:h-[80px]"
                priority
              />
           </div>
        </Link>

        <div className="hidden md:flex items-center justify-center h-full gap-1 lg:gap-2">
          
          <Link 
            href="/"
            className={`
              h-full flex items-center gap-2 px-1 relative transition-all cursor-pointer group
              ${isActive('/') 
                ? 'text-foreground opacity-100 border-b-2 border-foreground' 
                : 'text-muted-foreground hover:opacity-100 hover:text-primary border-b-2 border-transparent'
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
                ? 'text-foreground opacity-100 border-b-2 border-foreground' 
                : 'text-muted-foreground hover:opacity-100 hover:text-primary border-b-2 border-transparent'
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
                ? 'text-foreground opacity-100 border-b-2 border-foreground' 
                : 'text-muted-foreground hover:opacity-100 hover:text-primary border-b-2 border-transparent'
              }
            `}
          >
            <div className="p-2">
               <BookTextIcon size={24} />
            </div>
            <span className="text-sm font-medium">{t('calendar')}</span>
          </Link>

          {/* [NEW] Добавлен Calendar Link (Desktop) */}
          <Link 
            href="/calendar"
            className={`
              h-full flex items-center gap-2 px-1 relative group transition-all cursor-pointer
              ${isActive('/calendar') 
                ? 'text-foreground opacity-100 border-b-2 border-foreground' 
                : 'text-muted-foreground hover:opacity-100 hover:text-primary border-b-2 border-transparent'
              }
            `}
          >
            <div className="p-2">
               <CalendarDaysIcon size={24} />
            </div>
            {/* Используем новый ключ перевода, например 'calendar_days', чтобы не путать с 'calendar' выше */}
            <span className="text-sm font-medium">{t('calendar_days')}</span>
          </Link>

          <Link 
            href="/find-vet"
            className={`
              h-full flex items-center gap-2 px-1 relative group transition-all cursor-pointer
              ${isActive('/find-vet') 
                ? 'text-foreground opacity-100 border-b-2 border-foreground' 
                : 'text-muted-foreground hover:opacity-100 hover:text-primary border-b-2 border-transparent'
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
                    p-2 rounded-full transition duration-200 flex items-center justify-center outline-none focus-ring relative
                    ${isActive('/dashboard/messages')
                        ? 'text-primary bg-muted'
                        : 'text-muted-foreground hover:text-primary hover:bg-muted'
                    }
                  `}
                >
                   {/* Логика смены иконки */}
                   {unreadCount > 0 ? (
                      <MessageCircleMoreIcon size={24} />
                   ) : (
                      <MessageCircleIcon size={24} />
                   )}

                   {/* Счетчик сообщений (Badge) */}
                   {unreadCount > 0 && (
<span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground ring-2 ring-background">
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
                        p-2 rounded-full transition duration-200 flex items-center justify-center outline-none focus-ring
                        ${activeMenu === 'notifications' 
                            ? 'text-primary bg-muted' 
                            : 'text-muted-foreground hover:text-primary hover:bg-muted'
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
              <button className="hover:bg-muted p-2 rounded-full transition cursor-pointer">
                <Globe size={18} className="text-foreground" />
              </button>
            )}

          <ThemeToggle />

          {/* Кнопка Бургер-меню */}
          <button 
            onClick={() => toggleMenu('burger')}
            className={`
              flex items-center justify-center border rounded-full p-2.5 transition cursor-pointer ml-1 bg-card outline-none focus-ring
              ${activeMenu === 'burger' 
                  ? 'border-primary shadow-md text-primary' 
                  : 'border-border hover:shadow-md text-foreground'
              }
            `}
          >
            <Menu size={20} />
          </button>

          {/* Выпадающее Бургер-меню */}
          {activeMenu === 'burger' && (
            <div className="absolute top-full right-0 mt-2 w-[320px] bg-background rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.15)] border border-border py-2 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 text-left origin-top-right">
              
              {!isAuth ? (
                <>
                  <Link 
                    href="/login" 
                    onClick={closeMenu}
                    className="block px-4 py-3 text-sm font-bold text-foreground hover:bg-muted transition"
                  >
                    {t('login_signup')}
                  </Link>
                </>
              ) : (
                <>
                   <Link 
                    href="/profile" 
                    onClick={closeMenu}
                    className="block px-4 py-3 text-sm font-bold text-foreground hover:bg-muted transition"
                   >
                    {t('profile')}
                  </Link>
                  <Link 
                    href="/pets/create" 
                    onClick={closeMenu}
                    className="block px-4 py-3 text-sm font-normal text-muted-foreground hover:bg-muted transition border-b border-border"
                  >
                    {t('add_pet')}
                  </Link>
                </>
              )}

              <div className="py-2">
                <Link 
                    href="/become-vet" 
                    onClick={closeMenu}
                    className="block px-4 py-3 hover:bg-muted transition group"
                >
                   <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="text-sm font-bold text-foreground mb-0.5">{t('become_vet')}</div>
                        <div className="text-xs text-muted-foreground font-normal leading-snug">
                            {t('become_vet_desc')}
                        </div>
                      </div>
                      <div className="text-muted-foreground group-hover:text-primary transition flex-shrink-0">
                        <StethoscopeIcon size={28} />
                      </div>
                   </div>
                </Link>
              </div>

              {/* Мобильное меню */}
              <div className="md:hidden border-t border-border py-2">
                  <Link 
                    href="/" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition text-sm text-muted-foreground group"
                  >
                    <div className="text-muted-foreground group-hover:text-primary transition">
                        <HomeIcon size={24} />
                    </div>
                    <span>{t('home')}</span>
                 </Link>
                 <Link 
                    href="/dashboard" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition text-sm text-muted-foreground group"
                 >
                    <div className="text-muted-foreground group-hover:text-primary transition">
                        <BoneIcon size={24} />
                    </div>
                    <span>{t('dashboard')}</span>
                 </Link>
                 <Link 
                    href="/planboard" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition text-sm text-muted-foreground group"
                 >
                    <div className="text-muted-foreground group-hover:text-primary transition">
                        <BookTextIcon size={24} />
                    </div>
                    <span>{t('calendar')}</span>
                 </Link>

                 {/* [NEW] Добавлен Calendar Link (Mobile) */}
                 <Link 
                    href="/calendar" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition text-sm text-muted-foreground group"
                 >
                    <div className="text-muted-foreground group-hover:text-primary transition">
                        <CalendarDaysIcon size={24} />
                    </div>
                    <span>{t('calendar_days')}</span>
                 </Link>

                 <Link 
                    href="/find-vet" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition text-sm text-muted-foreground group"
                 >
                    <div className="text-muted-foreground group-hover:text-primary transition">
                        <MapPinIcon size={24} />
                    </div>
                    <span>{t('find_doctor')}</span>
                 </Link>
                 <Link 
                    href="/dashboard/messages" 
                    onClick={closeMenu}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted transition text-sm text-muted-foreground group"
                 >
                    <div className="text-muted-foreground group-hover:text-primary transition">
                        {/* Иконка в мобильном меню, тоже динамическая */}
                        {unreadCount > 0 ? <MessageCircleMoreIcon size={24}/> : <MessageCircleIcon size={24} />}
                    </div>
                    <span>
                        {t('messages')}
                        {unreadCount > 0 && <span className="ml-2 text-destructive font-bold">({unreadCount})</span>}
                    </span>
                 </Link>
              </div>

              <div className="border-t border-border py-2">
                {isAuth && (
                    <button 
                        onClick={() => {
                            closeMenu();
                            logout();
                        }}
                        className="block w-full text-left px-4 py-3 text-sm text-muted-foreground hover:bg-muted transition"
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