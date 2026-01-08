import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css"; // Обрати внимание: путь к CSS изменился (на уровень выше)

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Твои существующие импорты
import { AppModeProvider } from '@/components/providers/AppModeProvider';
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "PetVet",
  description: "Здоровье ваших питомцев",
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // 1. Асинхронно получаем параметры (требование Next.js 15)
  const { locale } = await params;

  // 2. Проверяем валидность языка. Если прилетел 'fr', а у нас его нет -> 404
  if (!['ru', 'en'].includes(locale)) {
    notFound();
  }

  // 3. Загружаем словари на сервере
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.className} bg-brand-bg text-brand-text min-h-screen`}>
        
        {/* ПОРЯДОК ВЛОЖЕННОСТИ:
          1. NextIntlClientProvider (дает переводы всему приложению)
          2. AppModeProvider (управляет режимом Вет/Владелец)
        */}
        
        <NextIntlClientProvider messages={messages}>
          <AppModeProvider>
            <Header />
            {children}
          </AppModeProvider>
        </NextIntlClientProvider>

      </body>
    </html>
  );
}