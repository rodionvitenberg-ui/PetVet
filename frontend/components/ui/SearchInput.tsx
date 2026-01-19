'use client';

import { Search } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce'; // Если нет, npm install use-debounce
// ИЛИ (если не хочешь ставить либу) напишем простую логику ниже:

export default function SearchInput({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Логика задержки (чтобы не спамить API)
  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams);
    
    // Сбрасываем пагинацию на 1 страницу при новом поиске
    params.set('page', '1');

    if (term) {
      params.set('search', term); // Ключ 'search' слушает Django Filter
    } else {
      params.delete('search');
    }
    
    // Обновляем URL без перезагрузки
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">Поиск</label>
      <input
        className="peer block w-full rounded-xl border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-100 outline-none"
        placeholder={placeholder}
        onChange={(e) => {
            // Простой дебаунс (таймер) внутри
            const val = e.target.value;
            // Лучше использовать use-debounce, но для MVP можно так:
            setTimeout(() => handleSearch(val), 300); 
        }}
        defaultValue={searchParams.get('search')?.toString()}
      />
      <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
    </div>
  );
}