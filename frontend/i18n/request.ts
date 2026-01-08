import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing'; // Мы создадим этот файл следующим шагом, или можно пока без него

export default getRequestConfig(async ({requestLocale}) => {
  // Эта функция выполняется на каждый запрос
  let locale = await requestLocale;

  // Если локаль не пришла или невалидна, используем 'ru'
  if (!locale || !['ru', 'en'].includes(locale)) {
    locale = 'ru';
  }

  return {
    locale,
    // Поднимаемся на уровень выше (..) и ищем папку messages
    messages: (await import(`../messages/${locale}.json`)).default
  };
});