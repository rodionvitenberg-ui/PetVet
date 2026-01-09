import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css"; // Путь правильный, так как файл лежит в папке [locale]

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing'; // Импортируем routing для проверки локалей

// Импортируем провайдеры
import { AppModeProvider } from '@/components/providers/AppModeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider'; 
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "PetVet",
  description: "Здоровье ваших питомцев",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // В Next.js 15 params — это Promise
}) {
  const { locale } = await params;

  // Проверяем, поддерживается ли локаль
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Загружаем сообщения для текущей локали на сервере
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.className} bg-brand-bg text-brand-text min-h-screen`}>
        
        {/* Провайдер переводов передает сообщения клиентским компонентам */}
        <NextIntlClientProvider messages={messages}>
          
          {/* Оборачиваем все приложение в AuthProvider (для авторизации) */}
          <AuthProvider> 
            
            {/* Провайдер темы/режима */}
            <AppModeProvider>
              <Header />
              {children}
            </AppModeProvider>
            
          </AuthProvider>
        </NextIntlClientProvider>

      </body>
    </html>
  );
}