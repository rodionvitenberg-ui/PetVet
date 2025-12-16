import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";

// 1. Импортируем наш новый провайдер
import { AppModeProvider } from '@/components/providers/AppModeProvider';
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "PetVet",
  description: "Здоровье ваших питомцев",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.className} bg-brand-bg text-brand-text min-h-screen`}>
        {/* 2. Оборачиваем Хедер и Контент в Провайдер */}
        <AppModeProvider>
            <Header />
            {children}
        </AppModeProvider>
      </body>
    </html>
  );
}