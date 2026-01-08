import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Импортируем провайдеры
import { AppModeProvider } from '@/components/providers/AppModeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider'; // <--- ДОБАВИТЬ ЭТО
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
  const { locale } = await params;

  if (!['ru', 'en'].includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.className} bg-brand-bg text-brand-text min-h-screen`}>
        
        <NextIntlClientProvider messages={messages}>
          {/* Оборачиваем все приложение в AuthProvider */}
          <AuthProvider> 
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