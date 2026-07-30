import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'ru'],
  defaultLocale: 'en',

  // Tell next-intl to never add locale prefixes to the URL
  localePrefix: 'never'
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);