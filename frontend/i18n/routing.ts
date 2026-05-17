import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en'], 
  defaultLocale: 'en',
  // Говорим next-intl вообще никогда не добавлять префиксы в URL:
  localePrefix: 'never' 
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);