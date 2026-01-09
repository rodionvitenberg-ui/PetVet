import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
 
export default createMiddleware(routing);
 
export const config = {
  // Matcher игнорирует файлы с точкой (картинки, css), папку _next и папку api
  // Всё остальное (включая /login) попадает в middleware и редиректится на /en/login
  matcher: ['/((?!api|_next|.*\\..*).*)']
};