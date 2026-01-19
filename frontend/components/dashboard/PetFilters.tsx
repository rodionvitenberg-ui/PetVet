'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { X, Loader2 } from 'lucide-react';
import { Category } from '@/types/pet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PetFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
        try {
            const res = await fetch(`${API_URL}/api/categories/`); 
            if (res.ok) {
                const data: Category[] = await res.json();
                const rootCategories = data.filter(c => !c.parent).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                setCategories(rootCategories);
            }
        } catch (e) {
            console.error("Failed to load categories", e);
        } finally {
            setLoading(false);
        }
    };
    fetchCategories();
  }, []);

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const currentGender = searchParams.get('gender')?.toString() || "";
  const currentSpecies = searchParams.get('species')?.toString() || "";

  // Общие стили для селектов, чтобы они выглядели одинаково
  const selectClasses = "border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-sm bg-white outline-none cursor-pointer hover:border-blue-300 transition focus:ring-2 focus:ring-blue-100 appearance-none min-w-[130px]";
  const iconWrapperClasses = "absolute right-2 top-1/2 -translate-y-1/2 text-gray-400";
  const clearBtnClasses = "absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-gray-100";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      
      {/* 1. ПОЛ (Gender) */}
      <div className="relative">
          <select 
            className={selectClasses}
            onChange={(e) => handleFilter('gender', e.target.value)}
            value={currentGender}
          >
            <option value="">Пол (Все)</option>
            <option value="M">Самец (M)</option>
            <option value="F">Самка (F)</option>
          </select>
          
          {currentGender && (
              <button 
                onClick={() => handleFilter('gender', "")}
                className={clearBtnClasses}
                title="Сбросить пол"
              >
                <X size={14} />
              </button>
          )}
      </div>

      {/* 2. ВИД (Species) */}
      <div className="relative">
        <select 
            className={selectClasses}
            onChange={(e) => handleFilter('species', e.target.value)}
            value={currentSpecies}
            disabled={loading}
        >
            <option value="">Вид (Все)</option>
            {categories.map(cat => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
            ))}
        </select>
        
        {loading ? (
            <div className={iconWrapperClasses}>
                <Loader2 size={14} className="animate-spin"/>
            </div>
        ) : currentSpecies && (
            <button 
                onClick={() => handleFilter('species', "")}
                className={clearBtnClasses}
                title="Сбросить вид"
            >
                <X size={14} />
            </button>
        )}
      </div>

    </div>
  );
}