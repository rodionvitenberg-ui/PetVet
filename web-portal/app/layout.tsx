import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";

// 1. Импортируем Хедер
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
        
        {/* 2. Вставляем Хедер сюда. Он будет на ВСЕХ страницах. */}
        <Header />
        
        {/* Здесь будет рендериться dashboard/page.tsx, calendar/page.tsx и т.д. */}
        {children}
        
      </body>
    </html>
  );
}