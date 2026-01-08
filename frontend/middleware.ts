import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['ru', 'en'],
  defaultLocale: 'ru',
  localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Явный пропуск API и системных файлов Next.js
  // Это предотвращает попадание API в intl-роутинг
  if (
    pathname.startsWith('/api') || 
    pathname.startsWith('/_next') || 
    pathname.includes('.') // Пропускаем файлы (favicon.ico, logo.png и т.д.)
  ) {
    return NextResponse.next();
  }

  // 2. Локализация (только для страниц)
  const response = intlMiddleware(request);

  // 3. Проверка авторизации
  // Убираем локаль (/ru/dashboard -> /dashboard)
  const pathWithoutLocale = pathname.replace(/^\/(ru|en)/, '');
  const token = request.cookies.get('access_token')?.value;

  const isProtectedRoute = 
       pathWithoutLocale.startsWith('/dashboard') || 
       pathWithoutLocale.startsWith('/pet') ||
       pathWithoutLocale === '/calendar';

  if (isProtectedRoute && !token) {
    const locale = request.nextUrl.locale || 'ru';
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }
  
  return response;
}

export const config = {
  // Матчер ловит ВСЁ, кроме системных папок Next.js
  // Внутри функции мы вручную отфильтруем api
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};