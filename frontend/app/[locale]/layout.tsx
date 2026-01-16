import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

// Импортируем провайдеры
import { AppModeProvider } from '@/components/providers/AppModeProvider';
// AuthProvider нам тут больше не нужен напрямую, он внутри Providers
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GoogleAuthWrapper } from '@/components/providers/GoogleAuthWrapper';
import { Providers } from "./providers"; // <--- ВОТ НАШ ГЕРОЙ
import NotificationListener from "@/components/providers/NotificationListener";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Care Your Pet",
  description: "Здоровье ваших питомцев",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.className} bg-primary-foreground text-brand-text min-h-screen`}>
        
        <NextIntlClientProvider messages={messages}>
          
          {/* БЫЛО: <AuthProvider> */}
          {/* СТАЛО: Используем наш Providers, внутри которого живет Toaster */}
          <Providers> 
            
            <AppModeProvider>
              <GoogleAuthWrapper>
                <NotificationListener />
                <Header />
                <main className="flex-grow">
                {children}
                </main>
                <Footer />
              </GoogleAuthWrapper>
            </AppModeProvider>
            
          </Providers>
          {/* БЫЛО: </AuthProvider> */}

        </NextIntlClientProvider>

      </body>
    </html>
  );
}