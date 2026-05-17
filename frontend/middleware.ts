import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Матчер должен ловить ВСЕ пути, кроме системных файлов Next.js и статики (картинок/pdf)
  matcher: [
    '/', 
    '/(en)/:path*', 
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ] 
};