import Link from 'next/link';

export const HeroSection = () => {
  return (
    <section className="py-20 text-center">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
          Вся история жизни твоего питомца <br />
          <span className="text-blue-600">в одном безопасном месте</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
          Создай цифровой профиль, веди историю болезней и скачивай 
          готовый PDF-паспорт для путешествий и визитов к врачу.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/pets/create" 
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
          >
            Создать паспорт питомца
          </Link>
          
          <Link 
            href="#about" 
            className="px-8 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-all"
          >
            Как это работает?
          </Link>
        </div>
      </div>
    </section>
  );
};