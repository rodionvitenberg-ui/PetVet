'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; 
import { useTranslations } from 'next-intl'; // Локализация
import { useAuth } from '@/components/providers/AuthProvider'; // Наш AuthProvider
import { 
  PawPrint,
  Calendar,
  ConciergeBell,
  Home,
  Globe,
  Menu,
  Stethoscope,      
} from 'lucide-react';
import NotificationsDropdown from './dashboard/NotificationsDropdown';

export default function Header() {
  const t = useTranslations('Navigation'); // Подключаем словарь
  const pathname = usePathname();
  const { isAuth, logout } = useAuth(); // Берем состояние из провайдера
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => pathname === path;

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 bg-header-bg w-full z-50 border-b border-gray-200 h-20">
      <div className="max-w-[1920px] mx-auto px-6 h-full flex items-center justify-between text-[#222222]">
        
        {/* 1. ЛЕВАЯ ЧАСТЬ (Логотип - без изменений) */}
        <Link href="/" className="flex items-center gap-1 flex-1">
          <PawPrint size={32} className="text-[#FF385C]" />
          <span className="text-xl font-bold text-[#FF385C] hidden md:block tracking-tighter">
            PetVet
          </span>
        </Link>

        {/* 2. ЦЕНТР (Навигация) */}
        <div className="hidden md:flex items-center justify-center h-full gap-8">
          
          {/* Вкладка 1: Мои питомцы */}
          <Link 
            href="/dashboard"
            className={`
              h-full flex items-center gap-2 px-1 relative transition-all cursor-pointer
              ${isActive('/dashboard') 
                ? 'text-black opacity-100 border-b-2 border-black' 
                : 'text-gray-500 hover:opacity-75 hover:text-black border-b-2 border-transparent'
              }
            `}
          >
            <div className={`p-2 rounded-full ${isActive('/dashboard') ? '' : 'bg-transparent'}`}>
               <Home size={24} strokeWidth={isActive('/dashboard') ? 2 : 1.5} />
            </div>
            <span className="text-sm font-medium">{t('dashboard')}</span>
          </Link>

          {/* Вкладка 2: Календарь */}
          <Link 
            href="/calendar"
            className={`
              h-full flex items-center gap-2 px-1 relative group transition-all cursor-pointer
              ${isActive('/calendar') 
                ? 'text-black opacity-100 border-b-2 border-black' 
                : 'text-gray-500 hover:opacity-75 hover:text-black border-b-2 border-transparent'
              }
            `}
          >
            <div className="p-2 rounded-full">
               <Calendar size={24} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium">{t('calendar')}</span>
          </Link>

          {/* Вкладка 3: Найти врача */}
          <Link 
            href="/services"
            className={`
              h-full flex items-center gap-2 px-1 relative group transition-all cursor-pointer
              ${isActive('/services') 
                ? 'text-black opacity-100 border-b-2 border-black' 
                : 'text-gray-500 hover:opacity-75 hover:text-black border-b-2 border-transparent'
              }
            `}
          >
            <div className="p-2 rounded-full">
               <ConciergeBell size={24} strokeWidth={1.5} />
            </div>
            <span className="text-sm font-medium">{t('find_doctor')}</span>
          </Link>
        </div>

        {/* 3. ПРАВАЯ ЧАСТЬ */}
        <div className="flex items-center justify-end gap-2 flex-1 relative" ref={menuRef}>
          
          {/* Кнопка "Для ветеринаров" */}
          <div className="hidden sm:flex flex-col items-end justify-center mr-1">
            <Link 
                href="/vet/register" 
                className="text-[12px] font-bold text-black hover:bg-gray-300 px-1 py-1 rounded-full transition whitespace-nowrap"
            >
                {t('for_veterinarians')}
            </Link>
          </div>

          {/* Уведомления или Глобус */}
          {isAuth ? (
              <NotificationsDropdown />
            ) : (
              <button className="hover:bg-gray-300 p-2 rounded-full transition cursor-pointer">
                <Globe size={18} className="text-black" />
              </button>
            )}

          {/* Кнопка Меню */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center border border-gray-300 rounded-full p-2.5 hover:shadow-md transition cursor-pointer ml-1 bg-white"
          >
            <Menu size={20} className="text-black" />
          </button>

          {/* ВЫПАДАЮЩЕЕ МЕНЮ */}
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-[320px] bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.15)] border border-gray-100 py-2 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 text-left">
              
              {/* Секция профиля / входа */}
              {!isAuth ? (
                <>
                  <Link href="/login" className="block px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50 transition">
                    {t('login_signup')}
                  </Link>
                </>
              ) : (
                <>
                   <Link href="/profile" className="block px-4 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50 transition">
                    {t('profile')}
                  </Link>
                  <Link href="/pets/create" className="block px-4 py-3 text-sm font-normal text-gray-600 hover:bg-gray-50 transition border-b border-gray-100">
                    {t('add_pet')}
                  </Link>
                </>
              )}

              {/* Секция ветеринара */}
              <div className="py-2">
                <Link href="/vet/register" className="block px-4 py-3 hover:bg-gray-50 transition group">
                   <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="text-sm font-bold text-gray-800 mb-0.5">{t('become_vet')}</div>
                        <div className="text-xs text-gray-500 font-normal leading-snug">
                            {t('become_vet_desc')}
                        </div>
                      </div>
                      <Stethoscope size={28} strokeWidth={1.5} className="text-gray-500 group-hover:text-black transition flex-shrink-0" />
                   </div>
                </Link>
              </div>

              {/* МОБИЛЬНАЯ НАВИГАЦИЯ (видна только на md и меньше) */}
              <div className="md:hidden border-t border-gray-100 py-2">
                 <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-sm text-gray-700">
                    <Home size={18} />
                    <span>{t('dashboard')}</span>
                 </Link>
                 <Link href="/calendar" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-sm text-gray-700">
                    <Calendar size={18} />
                    <span>{t('calendar')}</span>
                 </Link>
                 <Link href="/services" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-sm text-gray-700">
                    <ConciergeBell size={18} />
                    <span>{t('find_doctor')}</span>
                 </Link>
              </div>

              {/* Подвал (Помощь и выход) */}
              <div className="border-t border-gray-100 py-2">
                <Link href="/help" className="block px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition">
                  {t('help_center')}
                </Link>
                {isAuth && (
                    <button 
                        onClick={() => {
                            setIsMenuOpen(false); // Сначала закрываем меню
                            logout(); // Потом вызываем функцию из AuthProvider
                        }}
                        className="block w-full text-left px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition"
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