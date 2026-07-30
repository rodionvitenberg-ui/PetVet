import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Matcher must capture ALL paths except Next.js system files and static assets (images/pdf)
  matcher: [
    '/', 
    '/(en)/:path*', 
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ] 
};