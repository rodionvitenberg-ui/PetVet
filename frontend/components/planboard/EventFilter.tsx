'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { Filter, Loader2, X } from 'lucide-react';
import { EventType } from '@/types/event';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function EventFilter() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const [types, setTypes] = useState<EventType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

                const res = await fetch(`${API_URL}/api/event-types/`, { headers });
                
                if (res.ok) {
                    const data = await res.json();
                    
                    // Проверка: это массив или объект с пагинацией?
                    if (Array.isArray(data)) {
                        setTypes(data);
                    } else if (data.results && Array.isArray(data.results)) {
                        setTypes(data.results); // DRF Pagination
                    } else {
                        console.error("Неизвестный формат данных типов событий:", data);
                        setTypes([]);
                    }
                } else {
                    console.error("Ошибка загрузки типов:", res.status);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchTypes();
    }, []);

    const handleFilter = (slug: string) => {
        const params = new URLSearchParams(searchParams);
        if (slug) {
            params.set('eventType', slug);
        } else {
            params.delete('eventType');
        }
        replace(`${pathname}?${params.toString()}`);
    };

    const currentType = searchParams.get('eventType') || "";

    // Если типы не загрузились или их нет, не показываем пустой дропдаун (или показываем заглушку)
    if (!loading && types.length === 0) return null;

    return (
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Filter size={14} />
            </div>
            <select
                className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none cursor-pointer hover:border-blue-300 transition focus:ring-2 focus:ring-blue-100 appearance-none min-w-[160px]"
                onChange={(e) => handleFilter(e.target.value)}
                value={currentType}
                disabled={loading}
            >
                <option value="">Все задачи</option>
                {types.map(t => (
                    <option key={t.id} value={t.slug}>{t.name}</option>
                ))}
            </select>
            
            {loading && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                    <Loader2 size={12} className="animate-spin text-gray-400" />
                </div>
            )}

            {currentType && (
                <button 
                    onClick={() => handleFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                    title="Сбросить фильтр"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}