import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation'; // <-- Было createSharedPathnamesNavigation

export const routing = defineRouting({
  locales: ['ru', 'en'],
  defaultLocale: 'en'
});

// Используем createNavigation вместо createSharedPathnamesNavigation
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);