'use client';
import { useTranslations } from 'next-intl';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image'; // <--- 1. Импортируем компонент Image
import { 
  Mail, 
  Shield, 
  FileText,
  Info
} from 'lucide-react';

export default function Footer() {
  const t = useTranslations('Footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-muted-foreground py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* 1. БРЕНД */}
        <div className="space-y-4">
            <a href="https://busisart.space" target="_blank" rel="noopener noreferrer" className="text-2xl font-bold text-background flex items-center gap-3">
                {/* 2. ЗАМЕНЯЕМ ИКОНКУ НА ЛОГОТИП */}
                {/* Убедись, что имя файла совпадает (например, logo.png, logo.svg) */}
                <Image 
                    src="/logo1.png" 
                    alt="PetVet Logo" 
                    width={40} 
                    height={40} 
                    className="object-contain w-10 h-10 shrink-0" // Фиксированный квадрат 40x40 — логотип не сжимается
                />
                <span>careyour.pet</span>
            </a>
            <p className="text-sm leading-relaxed max-w-xs">
                {t('description')}
            </p>
        </div>

        {/* 2. НАВИГАЦИЯ */}
        <div>
            <h3 className="text-background font-bold mb-4">{t('platform')}</h3>
            <ul className="space-y-3 text-sm">
                <li>
                    <Link href="/dashboard" className="hover:text-primary transition">{t('perscab')}</Link>
                </li>
                <li>
                    <Link href="/find-vet" className="hover:text-primary transition">{t('findvet')}</Link>
                </li>
                <li>
                    <Link href="/become-vet" className="hover:text-primary transition">{t('forspec')}</Link>
                </li>
            </ul>
        </div>

        {/* 3. ДОКУМЕНТЫ */}
        <div>
            <h3 className="text-background font-bold mb-4">{t('rulinf')}</h3>
            <ul className="space-y-3 text-sm">
                <li>
                    <Link href="/about" className="flex items-center gap-2 hover:text-primary transition">
                        <Info size={14} /> {t('about')}
                    </Link>
                </li>
                <li>
                    <Link href="/privacy" className="flex items-center gap-2 hover:text-primary transition">
                        <Shield size={14} /> {t('policyconf')}
                    </Link>
                </li>
                <li>
                    <Link href="/terms" className="flex items-center gap-2 hover:text-primary transition">
                        <FileText size={14} /> {t('uslisp')}
                    </Link>
                </li>
            </ul>
        </div>

        {/* 4. КОНТАКТЫ */}
        <div>
            <h3 className="text-background font-bold mb-4">{t('contacts')}</h3>
            <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                    <Mail size={18} className="shrink-0 mt-0.5" />
                    <a href="mailto:support@petvet.app" className="hover:text-background transition">pleasecareyourpet@gmail.com</a>
                </li>
            </ul>
            
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 pt-8 text-sm text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
        <p>&copy; {currentYear} {t('pravzash')}</p>
        <p className="opacity-50">Powered by <a href="https://soshallitbe.cyou" target="_blank" rel="noopener noreferrer" className="hover:text-background transition">R.Vittenberg</a></p>
      </div>
    </footer>
  );
}