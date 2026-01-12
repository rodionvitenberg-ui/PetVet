'use client';

import React from 'react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Условия использования</h1>
        <p className="text-gray-500 mb-8">Последнее обновление: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <h3 className="text-red-700 font-bold mb-1">Важно: Медицинский отказ от ответственности</h3>
            <p className="text-sm text-red-600 m-0">
              PetVet не является заменой профессиональной ветеринарной помощи. В экстренных случаях, угрожающих жизни животного, немедленно обращайтесь в ближайшую ветеринарную клинику. Мы не несем ответственности за диагнозы, поставленные пользователями самостоятельно.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Общие положения</h2>
            <p>
              Используя приложение PetVet, вы соглашаетесь с данными Условиями. Если вы не согласны с каким-либо пунктом, пожалуйста, прекратите использование сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Аккаунты пользователей</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Владельцы:</strong> Вы несете ответственность за достоверность данных о своих питомцах.</li>
              <li><strong>Ветеринары:</strong> Для получения статуса "Ветеринар" вы обязаны предоставить подлинные документы о профильном образовании. Администрация оставляет за собой право отказать в верификации без объяснения причин.</li>
              <li>Вы обязаны сохранять конфиденциальность своих учетных данных (логина и пароля).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Правила поведения</h2>
            <p>Запрещается:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Использовать сервис для спама или мошенничества.</li>
              <li>Загружать контент, нарушающий законодательство или права третьих лиц.</li>
              <li>Выдавать себя за ветеринарного врача, не имея соответствующей квалификации.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Интеллектуальная собственность</h2>
            <p>
              Все права на дизайн, код и логотип PetVet принадлежат администрации сервиса. Пользовательский контент (фото питомцев) принадлежит пользователям, но вы предоставляете нам право на его хранение и отображение в рамках работы Сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Ограничение ответственности</h2>
            <p>
              Сервис предоставляется "как есть" (as is). Мы не гарантируем бесперебойную работу сервиса, хотя прилагаем все усилия для его стабильности. Мы не несем ответственности за потерю данных в результате форс-мажорных обстоятельств.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Изменения условий</h2>
            <p>
              Мы оставляем за собой право обновлять данные Условия. Продолжение использования сервиса после обновлений означает ваше согласие с новыми правилами.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Связь с нами</h2>
            <p>
              Вопросы и предложения направляйте на <a href="mailto:support@petvet.app" className="text-blue-600 font-medium">support@petvet.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}