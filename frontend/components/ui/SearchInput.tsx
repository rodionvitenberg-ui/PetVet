'use client';

import { Search } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export default function SearchInput({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleSearch = useDebouncedCallback((term: string) => {
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
  }, 300);

  return (
    <div className="relative flex flex-1 flex-shrink-0">
      <label htmlFor="search" className="sr-only">Поиск</label>
      <input
        id="search"
        className="peer block w-full rounded-xl border border-border py-[9px] pl-10 text-sm outline-2 placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none"
        placeholder={placeholder}
        onChange={(e) => handleSearch(e.target.value)}
        defaultValue={searchParams.get('search')?.toString()}
      />
      <Search className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground peer-focus:text-foreground" />
    </div>
  );
}