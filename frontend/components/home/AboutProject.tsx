import { useTranslations } from 'next-intl';

export const AboutProject = () => {
  const t = useTranslations('AboutProject');
  return (
    <section id="about" className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Блок 1 */}
          <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-12 h-12 bg-blue-600 text-blue-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              📂
            </div>
            <h3 className="text-xl font-bold mb-2">{t('archive_title')}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('archive_desc')}
            </p>
          </div>

          {/* Блок 2 */}
          <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-12 h-12 bg-blue-600  text-purple-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              📄
            </div>
            <h3 className="text-xl font-bold mb-2">{t('passport_title')}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('passport_desc')}
            </p>
          </div>

          {/* Блок 3 */}
          <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-12 h-12 bg-blue-600  text-green-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              🔒
            </div>
            <h3 className="text-xl font-bold mb-2">{t('security_title')}</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {t('security_desc')}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};