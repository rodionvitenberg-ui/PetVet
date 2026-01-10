'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // 1. Импорт Image
import { usePathname } from 'next/navigation'; 
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAppMode } from '@/components/providers/AppModeProvider';
import { 
  Menu,
  Globe
} from 'lucide-react';
import NotificationsDropdown from './dashboard/NotificationsDropdown';

// Импорт кастомных анимированных иконок
import { BoneIcon } from '@/components/ui/bone';
import { BookTextIcon } from '@/components/ui/book-text';
import { MapPinIcon } from '@/components/ui/map-pin';
import { HomeIcon } from '@/components/ui/home';
import { StethoscopeIcon } from '@/components/ui/stethoscope';
import { BellIcon } from '@/components/ui/bell';

type ActiveMenu = 'notifications' | 'burger' | null;

export default function Header() {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const { isAuth, logout } = useAuth();
  const { toggleMode, isVetMode } = useAppMode();
  
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

  const toggleMenu = (menu: ActiveMenu) => {
    setActiveMenu(prev => prev === menu ? null : menu);
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
    <header className="fixed top-0 bg-gray-100 w-full z-50 border-b border-gray-200 h-20">
      <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between text-[#222222]">
        
        {/* 1. ЛЕВАЯ ЧАСТЬ (Логотип + Текст снизу) */}
        <div className="flex items-center flex-1 select-none">
           {/* Контейнер для вертикального выравнивания */}
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
          
          {/* HOME */}
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

          {/* DASHBOARD */}
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

          {/* CALENDAR */}
          <Link 
            href="/calendar"
            className={`
              h-full flex items-center gap-2 px-1 relative group transition-all cursor-pointer
              ${isActive('/calendar') 
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

          {/* SERVICES (FIND DOCTOR) */}
          <Link 
            href="/services"
            className={`
              h-full flex items-center gap-2 px-1 relative group transition-all cursor-pointer
              ${isActive('/services') 
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
          
          {/* Кнопка переключения режимов */}
          <div className="hidden sm:flex flex-col items-end justify-center mr-2">
             <button 
                onClick={toggleMode}
                className={`
                    text-xs font-bold transition-colors duration-200 outline-none
                    ${isVetMode 
                        ? 'text-emerald-600 hover:text-emerald-800' 
                        : 'text-blue-600 hover:text-blue-800'
                    }
                `}
            >
                {isVetMode ? t('for_owners') : t('for_veterinarians')}
            </button>
          </div>

          {isAuth ? (
              <div className="relative">
                {/* Кнопка-триггер: Анимированный колокольчик */}
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
                  <Link href="/login" className="block px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-100 transition">
                    {t('login_signup')}
                  </Link>
                </>
              ) : (
                <>
                   <Link href="/profile" className="block px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-100 transition">
                    {t('profile')}
                  </Link>
                  <Link href="/pets/create" className="block px-4 py-3 text-sm font-normal text-gray-600 hover:bg-gray-100 transition border-b border-gray-100">
                    {t('add_pet')}
                  </Link>
                </>
              )}

              <div className="py-2">
                <Link href="/vet/register" className="block px-4 py-3 hover:bg-gray-100 transition group">
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
                  <Link href="/home" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition text-sm text-gray-700 group">
                    <div className="text-gray-500 group-hover:text-primary transition">
                        <HomeIcon size={24} />
                    </div>
                    <span>{t('home')}</span>
                 </Link>
                 <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition text-sm text-gray-700 group">
                    <div className="text-gray-500 group-hover:text-primary transition">
                        <BoneIcon size={24} />
                    </div>
                    <span>{t('dashboard')}</span>
                 </Link>
                 <Link href="/calendar" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition text-sm text-gray-700 group">
                    <div className="text-gray-500 group-hover:text-primary transition">
                        <BookTextIcon size={24} />
                    </div>
                    <span>{t('calendar')}</span>
                 </Link>
                 <Link href="/services" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 transition text-sm text-gray-700 group">
                    <div className="text-gray-500 group-hover:text-primary transition">
                        <MapPinIcon size={24} />
                    </div>
                    <span>{t('find_doctor')}</span>
                 </Link>
              </div>

              <div className="border-t border-gray-100 py-2">
                <Link href="/help" className="block px-4 py-3 text-sm text-gray-600 hover:bg-gray-100 transition">
                  {t('help_center')}
                </Link>
                {isAuth && (
                    <button 
                        onClick={() => {
                            setActiveMenu(null);
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