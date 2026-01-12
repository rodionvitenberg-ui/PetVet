'use client';

import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Политика конфиденциальности</h1>
        <p className="text-gray-500 mb-8">Последнее обновление: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-blue max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Введение</h2>
            <p>
              Добро пожаловать в PetVet («мы», «наш» или «Платформа»). Мы серьезно относимся к конфиденциальности ваших данных. 
              Настоящая Политика описывает, как мы собираем, используем и защищаем информацию пользователей приложения PetVet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Какие данные мы собираем</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Данные аккаунта:</strong> Имя, email, фото профиля, город, а также ссылки на социальные сети и мессенджеры (Telegram, WhatsApp), если вы решите указать их в профиле.</li>
              <li><strong>Данные о питомцах:</strong> Клички, породы, возраст, медицинская история, фотографии и файлы, загруженные вами.</li>
              <li><strong>Документы ветеринаров:</strong> Фотографии дипломов и лицензий для подтверждения квалификации (хранятся в закрытом доступе и используются только для верификации).</li>
              <li><strong>Геолокация:</strong> Мы запрашиваем доступ к вашему точному местоположению исключительно для отображения ближайших ветеринарных клиник на карте. Эти данные обрабатываются на вашем устройстве и не сохраняются на наших серверах.</li>
              <li><strong>Технические данные:</strong> IP-адрес, тип устройства, файлы Cookie (для сохранения сессии авторизации).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Как мы используем ваши данные</h2>
            <p>Мы используем собранную информацию для:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Предоставления доступа к сервису и личному кабинету.</li>
              <li>Ведения цифровой медицинской карты питомца.</li>
              <li>Верификации статуса ветеринарного врача.</li>
              <li>Связи с вами по техническим вопросам (через email).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Доступ к данным и передача третьим лицам</h2>
            <p>
              Мы <strong>не продаем</strong> ваши персональные данные. Доступ к медицинской карте питомца предоставляется только:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Вам (Владельцу).</li>
              <li>Ветеринарным врачам, которым <strong>вы лично</strong> предоставили доступ (например, по ссылке или через интерфейс приложения).</li>
            </ul>
            <p className="mt-2">
              Мы используем сторонние сервисы для работы приложения (хостинг, хранение файлов, авторизация Google), которые обязаны соблюдать конфиденциальность.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Google User Data</h2>
            <p>
              При входе через Google мы получаем доступ только к вашему email, имени и публичному аватару. 
              Эти данные используются исключительно для создания и идентификации вашего профиля в системе PetVet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Удаление данных</h2>
            <p>
              Вы имеете право запросить полное удаление вашего аккаунта и всех связанных данных. 
              Для этого отправьте запрос на <a href="mailto:support@petvet.app" className="text-blue-600 hover:underline">support@petvet.app</a> или воспользуйтесь функцией удаления в настройках профиля.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Контакты</h2>
            <p>
              Если у вас есть вопросы по поводу этой Политики, свяжитесь с нами: <br />
              Email: <a href="mailto:support@petvet.app" className="text-blue-600 font-medium">support@petvet.app</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}