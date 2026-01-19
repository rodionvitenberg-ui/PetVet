'use client';
import { useTranslations } from 'next-intl';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // <--- 1. Импортируем компонент Image
import { 
  Github, 
  Send, 
  Mail, 
  MapPin, 
  Shield, 
  FileText
} from 'lucide-react';

export default function Footer() {
  const t = useTranslations('Footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* 1. БРЕНД */}
        <div className="space-y-4">
            <Link href="/" className="text-2xl font-bold text-white flex items-center gap-3">
                {/* 2. ЗАМЕНЯЕМ ИКОНКУ НА ЛОГОТИП */}
                {/* Убедись, что имя файла совпадает (например, logo.png, logo.svg) */}
                <Image 
                    src="/logo1.png" 
                    alt="PetVet Logo" 
                    width={40} 
                    height={40} 
                    className="object-contain" // Чтобы логотип не растягивался
                />
                <span>careyour.pet</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
                {t('description')}
            </p>
        </div>

        {/* 2. НАВИГАЦИЯ */}
        <div>
            <h3 className="text-white font-bold mb-4">{t('platform')}</h3>
            <ul className="space-y-3 text-sm">
                <li>
                    <Link href="/dashboard" className="hover:text-blue-400 transition">{t('perscab')}</Link>
                </li>
                <li>
                    <Link href="/find-vet" className="hover:text-blue-400 transition">{t('findvet')}</Link>
                </li>
                <li>
                    <Link href="/become-vet" className="hover:text-blue-400 transition">{t('forspec')}</Link>
                </li>
            </ul>
        </div>

        {/* 3. ДОКУМЕНТЫ */}
        <div>
            <h3 className="text-white font-bold mb-4">{t('rulinf')}</h3>
            <ul className="space-y-3 text-sm">
                <li>
                    <Link href="/privacy" className="flex items-center gap-2 hover:text-blue-400 transition">
                        <Shield size={14} /> {t('policyconf')}
                    </Link>
                </li>
                <li>
                    <Link href="/terms" className="flex items-center gap-2 hover:text-blue-400 transition">
                        <FileText size={14} /> {t('uslisp')}
                    </Link>
                </li>
            </ul>
        </div>

        {/* 4. КОНТАКТЫ */}
        <div>
            <h3 className="text-white font-bold mb-4">{t('contacts')}</h3>
            <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                    <Mail size={18} className="shrink-0 mt-0.5" />
                    <a href="mailto:support@petvet.app" className="hover:text-white transition">pleasecareyourpet@gmail.com</a>
                </li>
            </ul>
            
            <div className="flex gap-4 mt-6">
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-blue-600 hover:text-white transition">
                    <Send size={18} />
                </a>
                <a href="#" className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 hover:text-white transition">
                    <Github size={18} />
                </a>
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 pt-8 text-sm text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>&copy; {currentYear} {t('pravzash')}</p>
        <p className="opacity-50">Powered by Debell</p>
      </div>
    </footer>
  );
}