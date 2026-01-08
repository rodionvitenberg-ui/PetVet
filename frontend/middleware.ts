// frontend/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 1. Инициализируем middleware локализации
const intlMiddleware = createMiddleware({
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  localePrefix: 'always' // Всегда добавлять префикс (/ru/...)
});

export default function middleware(request: NextRequest) {
  // 2. Сначала запускаем локализацию (она разберется с редиректами / -> /ru)
  const response = intlMiddleware(request);

  // 3. Теперь проверяем авторизацию
  // Нам нужно понять, куда идет юзер, игнорируя локаль в начале пути
  const { pathname } = request.nextUrl;
  
  // Убираем локаль из пути (/ru/dashboard -> /dashboard) для проверки
  const pathWithoutLocale = pathname.replace(/^\/(ru|en)/, '');

  const token = request.cookies.get('access_token')?.value;

  // Список защищенных путей (как раньше)
  // Защищаем dashboard, pet, и корень (если нужно)
  const isProtectedRoute = 
       pathWithoutLocale === '/' || 
       pathWithoutLocale.startsWith('/pet') || 
       pathWithoutLocale.startsWith('/dashboard');

  const isLoginPage = pathWithoutLocale === '/login';

  // Если пытаемся зайти в защищенную зону без токена
  if (isProtectedRoute && !token) {
    // Редиректим на логин с сохранением текущей локали
    const locale = request.nextUrl.locale || 'ru'; // или достаем из pathname
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Если авторизован и пытается зайти на логин -> в дашборд
  if (isLoginPage && token) {
    const locale = pathname.split('/')[1] || 'ru';
    return NextResponse.redirect(new URL(`/${locale}/`, request.url));
  }

  return response;
}

export const config = {
  // Матчер должен ловить всё, кроме статики и API
  matcher: ['/((?!api|_next|.*\\..*).*)']
};