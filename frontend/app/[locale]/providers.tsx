'use client';

// 1. Импорт основного провайдера (теперь он должен работать)
import { HeroUIProvider } from '@heroui/react';
// 2. Импорт провайдера тоастов
import { ToastProvider } from "@heroui/toast";
import { AuthProvider } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    // HeroUIProvider требует navigate проп для SPA-переходов (опционально, но полезно)
    <HeroUIProvider navigate={router.push}>
      <AuthProvider>
        {children}
        
        {/* Тоасты HeroUI */}
        <ToastProvider 
          placement="top-right" 
          toastOffset={20}
        />
      </AuthProvider>
    </HeroUIProvider>
  );
}