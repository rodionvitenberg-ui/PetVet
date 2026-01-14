'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // <--- Добавили usePathname
import { useAuth } from '@/components/providers/AuthProvider';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname(); // <--- Получаем текущий путь (например, /planboard)

    useEffect(() => {
        if (!isLoading && !user) {
            // Было: router.push('/login');
            // Стало: кодируем путь и передаем как параметр
            router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
        }
    }, [user, isLoading, router, pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen w-full bg-gray-50/50 pt-24 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen w-full bg-gray-50/50 pt-24 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return <>{children}</>;
}