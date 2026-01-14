export const AboutProject = () => {
  return (
    <section id="about" className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Блок 1 */}
          <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              📂
            </div>
            <h3 className="text-xl font-bold mb-2">Цифровой архив</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Забудьте о потерянных справках. Храните анализы, прививки и назначения врача в облаке.
            </p>
          </div>

          {/* Блок 2 */}
          <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              📄
            </div>
            <h3 className="text-xl font-bold mb-2">PDF-паспорт</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Генерируйте полный отчет о здоровье питомца одним кликом. Идеально для путешествий.
            </p>
          </div>

          {/* Блок 3 */}
          <div className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4 text-2xl">
              🔒
            </div>
            <h3 className="text-xl font-bold mb-2">Безопасность</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Данные надежно защищены. Вы сами решаете, кто видит профиль вашего питомца — он может быть приватным или публичным.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};