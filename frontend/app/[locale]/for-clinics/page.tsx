'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Calendar, 
  MessageCircle, 
  LayoutDashboard, 
  ShieldCheck, 
  ArrowRight, 
  Rocket 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForClinicsPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      <Header />
      
      <main className="flex-grow pt-20">
        
        {/* === 1. HERO SECTION === */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50 py-20 lg:py-32">
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-sm font-bold mb-6 tracking-wide uppercase">
                Для владельцев ветеринарных клиник
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                Собственный цифровой инструмент <br className="hidden md:block"/>
                для вашей клиники — <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">careyour.pet</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
                Мы развернем вашу личную White-Label платформу. Управляйте питомцами, ведите карты, планируйте процедуры и общайтесь с клиентами в одной экосистеме под вашим брендом.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link 
                  href="https://t.me/rodionvitenberg" 
                  target="_blank"
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                  <Rocket size={20} />
                  Заказать Пилот за 700€
                </Link>
                <Link 
                  href="/dashboard" 
                  className="w-full sm:w-auto px-8 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Смотреть демо
                </Link>
              </div>
            </motion.div>
          </div>
          
          {/* Decorative background blobs */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2 animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2 animate-blob animation-delay-2000"></div>
        </section>

        {/* === 2. PROBLEM / PAIN POINTS === */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-4">Почему клиники теряют деньги?</h2>
              <p className="text-slate-500">
                Рутина и отсутствие централизованного контроля съедают до 30% рабочего времени врачей.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <PainCard 
                icon={<XCircle className="text-red-500" size={32} />}
                title="Хаос в записях"
                desc="Бумажные журналы, Excel-таблицы, потерянные анализы. История болезни собирается по крупицам."
              />
              <PainCard 
                icon={<Activity className="text-red-500" size={32} />}
                title="Нет контроля"
                desc="Вы не видите полную картину по пациентам. Кто вернулся на повторный прием, а кто забыл?"
              />
              <PainCard 
                icon={<Calendar className="text-red-500" size={32} />}
                title="Потеря времени"
                desc="Врачи тратят часы на заполнение однотипных бумаг вместо того, чтобы лечить животных."
              />
              <PainCard 
                icon={<MessageCircle className="text-red-500" size={32} />}
                title="Сложная связь"
                desc="Клиенты пишут в WhatsApp, звонят, теряют назначения. Нет единого канала общения."
              />
            </div>
          </div>
        </section>

        {/* === 3. SOLUTION / PRODUCT === */}
        <section id="solution" className="py-20 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="text-emerald-600 font-bold uppercase tracking-wider text-sm">Ваше решение</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2">
                Полностью ваш бренд. Ваши правила.
              </h2>
            </div>

            <div className="space-y-24">
              {/* Feature 1 */}
              <FeatureBlock 
                badge="White-Label"
                title="Ваш логотип, ваш домен, ваши цвета"
                desc="Мы не продаем вам доступ к чужому сервису. Мы разворачиваем отдельный экземпляр платформы специально для вас. Клиенты видят только ваш бренд."
                image="/bg/bg1.jpg" // Замените на реальный скриншот дашборда с логотипом
                reversed={false}
              />
              
              {/* Feature 2 */}
              <FeatureBlock 
                badge="Электронная медкарта"
                title="Полный контроль над пациентами"
                desc="Создание карточек, история болезней, загрузка анализов и снимков. Вся жизнь питомца как на ладони. Доступно и врачу, и владельцу (в режиме чтения)."
                image="/bg/bg2.webp" // Замените на скриншот профиля питомца
                reversed={true}
              />

              {/* Feature 3 */}
              <FeatureBlock 
                badge="Канбан-доска"
                title="Планирование без накладок"
                desc="Визуальная доска задач для стационара и процедур. Перетаскивайте карточки, меняйте статусы, назначайте ответственных. Ничего не потеряется."
                image="/bg/71oMv1ybi9L.jpg" // Замените на скриншот канбана
                reversed={false}
              />
            </div>
          </div>
        </section>

        {/* === 4 & 5. PRICING (PILOT vs FULL) === */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Простые и прозрачные условия</h2>
              <p className="text-slate-500 max-w-2xl mx-auto">
                Начните с пилота, чтобы оценить ценность без больших вложений.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
              
              {/* Pilot Card */}
              <div className="border border-slate-200 rounded-3xl p-8 hover:shadow-xl transition-shadow relative bg-white">
                <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl text-xs uppercase">
                  Старт
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Пилот / Демо</h3>
                <div className="text-4xl font-extrabold text-blue-600 mb-6">700€ <span className="text-lg font-normal text-slate-400">/ разово</span></div>
                
                <p className="text-slate-600 mb-8 h-12">
                  Идеально, чтобы попробовать инструмент в бою в течение 10 дней.
                </p>

                <ul className="space-y-4 mb-8">
                  <CheckItem text="10 дней тестового использования" />
                  <CheckItem text="Базовый функционал (карты, записи)" />
                  <CheckItem text="Оценка удобства интерфейса" />
                  <CheckItem text="Быстрый запуск" />
                </ul>

                <Link 
                   href="https://t.me/rodionvitenberg"
                   target="_blank"
                   className="block w-full py-4 text-center rounded-xl font-bold border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition"
                >
                  Запустить пилот
                </Link>
              </div>

              {/* Full Version Card */}
              <div className="border-2 border-emerald-500 rounded-3xl p-8 shadow-2xl relative bg-emerald-50/10 scale-105 z-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-bold px-4 py-1 rounded-full text-sm shadow-md">
                  Рекомендуемый выбор
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">White-Label Версия</h3>
                <div className="text-4xl font-extrabold text-emerald-600 mb-2">2000€ <span className="text-lg font-normal text-slate-400">/ сетап</span></div>
                <div className="text-sm text-slate-500 mb-6">+ 100€/мес поддержка</div>

                <p className="text-slate-600 mb-8 h-12">
                  Ваша собственная независимая платформа. Веб-версия + PWA.
                </p>

                <ul className="space-y-4 mb-8">
                  <CheckItem text="Полное брендирование (Лого, Цвета, Домен)" highlight />
                  <CheckItem text="Безлимитное количество врачей и пациентов" highlight />
                  <CheckItem text="Веб-версия + Адаптив (PWA)" />
                  <CheckItem text="Приоритетная настройка под ваши нужды" />
                  <CheckItem text="Подключение мобильного приложения (Roadmap)" />
                </ul>

                <Link 
                   href="https://t.me/rodionvitenberg" 
                   target="_blank"
                   className="block w-full py-4 text-center rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  Обсудить внедрение
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* === 6. SOCIAL PROOF === */}
        <section className="py-16 bg-slate-900 text-white text-center">
          <div className="container mx-auto px-4">
            <p className="text-slate-400 uppercase tracking-widest text-sm font-bold mb-8">
              Платформа, на которой работает
            </p>
            <div className="flex justify-center items-center opacity-70 hover:opacity-100 transition-opacity">
               {/* Здесь должен быть ваш логотип PetVet, использую текст для примера */}
               <div className="flex items-center gap-2 text-3xl font-bold">
                 <ShieldCheck size={40} className="text-emerald-400" />
                 <span>PetVet</span>
               </div>
            </div>
            <p className="mt-6 text-slate-400 text-sm">
              Careyour.pet — это демонстрация того, как может работать ваша клиника.
            </p>
          </div>
        </section>

        {/* === 7. FINAL CTA === */}
        <section className="py-24 bg-blue-600 relative overflow-hidden">
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Готовы к цифровой трансформации?
            </h2>
            <p className="text-blue-100 text-xl max-w-2xl mx-auto mb-10">
              Не откладывайте модернизацию. Свяжитесь с нами сегодня и получите готовый инструмент для работы.
            </p>
            <Link 
              href="https://t.me/rodionvitenberg"
              target="_blank"
              className="inline-flex items-center gap-2 px-10 py-5 bg-white text-blue-600 font-extrabold text-lg rounded-full shadow-2xl hover:bg-blue-50 transition-all transform hover:-translate-y-1"
            >
              Получить пилот за 700€ <ArrowRight size={20} />
            </Link>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full translate-x-1/3 translate-y-1/3"></div>
        </section>

      </main>
    </div>
  );
}

// === SUBCOMPONENTS (Вспомогательные компоненты для чистоты кода) ===

function PainCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-red-200 transition-colors text-left group">
      <div className="mb-4 bg-white w-14 h-14 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}

function FeatureBlock({ badge, title, desc, image, reversed }: { badge: string, title: string, desc: string, image: string, reversed: boolean }) {
  return (
    <div className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12`}>
      <div className="flex-1 text-left">
        <span className="text-blue-600 font-bold uppercase tracking-wider text-xs bg-blue-100 px-3 py-1 rounded-full mb-4 inline-block">
          {badge}
        </span>
        <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
          {title}
        </h3>
        <p className="text-lg text-slate-600 mb-6 leading-relaxed">
          {desc}
        </p>
        <div className="h-1 w-20 bg-blue-600 rounded-full"></div>
      </div>
      
      <div className="flex-1 w-full">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white transform rotate-2 hover:rotate-0 transition-all duration-500">
          <div className="aspect-video bg-slate-200 relative">
             {/* Имитация интерфейса, если картинки нет */}
             <img src={image} alt={title} className="object-cover w-full h-full" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ text, highlight = false }: { text: string, highlight?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className={`shrink-0 ${highlight ? 'text-emerald-500' : 'text-blue-500'}`} size={20} />
      <span className={`text-sm ${highlight ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{text}</span>
    </li>
  );
}