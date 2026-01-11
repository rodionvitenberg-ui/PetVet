'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// ДИНАМИЧЕСКИЙ ИМПОРТ (Обязательно для карт!)
const VetMap = dynamic(() => import('@/components/map/VetMap'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[600px] bg-gray-50 rounded-3xl">
       <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
       <p className="text-gray-400 text-sm mt-2">Загружаем карту...</p>
    </div>
  ),
});

export default function FindVetPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4">
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
            <div className="flex flex-col h-full space-y-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Найти ветеринара</h1>
                    <p className="text-gray-500">Показываем ближайшие клиники на основе открытых данных OpenStreetMap.</p>
                </div>
                
                <div className="flex-1">
                    <VetMap />
                </div>
            </div>
        </div>
    </div>
  );
}