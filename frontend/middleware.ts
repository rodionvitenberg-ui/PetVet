import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
  // 1. Сначала локализация
  const response = intlMiddleware(request);

  // 2. Проверка авторизации
  const { pathname } = request.nextUrl;
  const pathWithoutLocale = pathname.replace(/^\/(ru|en)/, '');
  
  const token = request.cookies.get('access_token')?.value;

  // Список защищенных маршрутов (куда нельзя без токена)
  // ВАЖНО: Мы НЕ включаем сюда '/' (Главную), она публичная
  const isProtectedRoute = 
       pathWithoutLocale.startsWith('/dashboard') || 
       pathWithoutLocale.startsWith('/pet') ||
       pathWithoutLocale === '/calendar'; // Добавь сюда то, что реально требует входа

  // Если нет токена и идем в закрытую зону -> на логин
  if (isProtectedRoute && !token) {
    const locale = request.nextUrl.locale || 'ru';
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // === ГЛАВНОЕ ИЗМЕНЕНИЕ ===
  // Мы УБРАЛИ блок "if (isLoginPage && token) -> redirect('/')"
  // Теперь, если у тебя "битая" кука, ты спокойно откроешь /login и сможешь перелогиниться.
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
};