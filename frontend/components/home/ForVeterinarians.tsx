import Link from 'next/link';
import { useTranslations } from 'next-intl';

export const ForVeterinarians = () => {
  const t = useTranslations('ForVeterinarians');
  return (
    <section className="py-20 bg-gray-900 text-white mt-10">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-4">{t('title')}</h2>
        <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
         {t('description')}
        </p>
        <Link 
          href="/become-vet" 
          className="inline-block px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-blue-50 transition-colors"
        >
          {t('button')}
        </Link>
      </div>
    </section>
  );
};