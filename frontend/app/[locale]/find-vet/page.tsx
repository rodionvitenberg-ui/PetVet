'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// ДИНАМИЧЕСКИЙ ИМПОРТ (Обязательно для карт!)
const VetMap = dynamic(() => import('@/components/map/VetMap'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-[600px] bg-muted rounded-3xl">
       <Loader2 className="w-8 h-8 text-primary animate-spin" />
       <p className="text-muted-foreground text-sm mt-2">Loading map...</p>
    </div>
  ),
});

export default function FindVetPage() {
  return (
    <div className="min-h-screen bg-muted pt-24 pb-10 px-4">
        <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
            <div className="flex flex-col h-full space-y-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Find Veterinarian</h1>
                    <p className="text-muted-foreground">Showing nearby clinics based on open data from OpenStreetMap.</p>
                </div>
                
                <div className="flex-1">
                    <VetMap />
                </div>
            </div>
        </div>
    </div>
  );
}