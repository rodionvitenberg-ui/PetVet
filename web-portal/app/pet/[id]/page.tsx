'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Calendar, Syringe, Pill, Stethoscope, 
  Weight, Activity, CheckCircle2, FileText, User 
} from 'lucide-react';

// === ТИПЫ ДАННЫХ ===
interface HealthEvent {
  id: number;
  event_type: 'vaccine' | 'parasite' | 'medical' | 'hygiene' | 'measure' | 'other';
  event_type_display: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  is_verified: boolean;
  created_by_name: string;
  created_by_is_vet: boolean;
  created_by_clinic?: string;
}

interface PetDetail {
  id: number;
  name: string;
  age: string;
  gender: 'M' | 'F';
  images: { image: string }[];
  attributes: { attribute: { name: string }, value: string }[];
}

export default function PetDetailPage() {
  const { id } = useParams(); // Получаем ID из URL
  const router = useRouter();
  
  const [pet, setPet] = useState<PetDetail | null>(null);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // 1. Загружаем данные ПИТОМЦА
        const petRes = await fetch(`http://127.0.0.1:8000/api/pets/${id}/`, { // Внимание: тут может быть нужен slug, но пока пробуем id или поменяй на slug в API
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // 2. Загружаем СОБЫТИЯ (Всю медкарту)
        // ВАЖНО: Сейчас мы тянем все события. В идеале на бэке нужен фильтр ?pet=ID
        // Пока сделаем фильтрацию на клиенте (для MVP)
        const eventsRes = await fetch(`http://127.0.0.1:8000/api/events/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (petRes.ok && eventsRes.ok) {
          const petData = await petRes.json();
          const allEvents = await eventsRes.json();
          
          // Фильтруем события только для ЭТОГО питомца
          const petEvents = allEvents.filter((e: any) => e.pet === Number(id));
          
          setPet(petData);
          setEvents(petEvents);
        }
      } catch (error) {
        console.error("Ошибка:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id, router]);

  if (loading) return <div className="p-10 text-center">Загрузка карточки...</div>;
  if (!pet) return <div className="p-10 text-center">Питомец не найден</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* --- ШАПКА (PASSPORT) --- */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        {/* Навигация назад */}
        <div className="px-4 py-4 max-w-3xl mx-auto flex items-center gap-4">
           <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition">
             <ArrowLeft size={24} className="text-gray-600"/>
           </button>
           <h1 className="text-xl font-bold text-gray-900">Медицинская карта</h1>
        </div>

        {/* Профиль питомца */}
        <div className="px-4 pb-8 max-w-3xl mx-auto flex items-center gap-6">
           <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden shadow-md border-4 border-white">
             {pet.images[0] ? (
               <img src={pet.images[0].image} className="w-full h-full object-cover" />
             ) : (
               <div className="flex items-center justify-center h-full text-3xl">🐾</div>
             )}
           </div>
           
           <div>
             <h2 className="text-3xl font-bold text-gray-900">{pet.name}</h2>
             <div className="flex items-center gap-3 text-gray-500 mt-1">
               <span>{pet.age}</span>
               <span>•</span>
               <span className={pet.gender === 'M' ? 'text-blue-500 font-medium' : 'text-pink-500 font-medium'}>
                 {pet.gender === 'M' ? 'Мальчик' : 'Девочка'}
               </span>
             </div>
           </div>
        </div>
      </div>

      {/* --- TIMELINE (ЛЕНТА СОБЫТИЙ) --- */}
      <div className="max-w-3xl mx-auto px-4 mt-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800">История событий</h3>
          <button className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition shadow-lg flex items-center gap-2">
             <span>+ Запись</span>
          </button>
        </div>

        <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-12">
          
          {events.length === 0 && (
            <div className="ml-8 py-4 text-gray-400 italic">
              Записей пока нет. Начните историю!
            </div>
          )}

          {events.map((event) => (
            <div key={event.id} className="relative ml-8 group">
              
              {/* ТОЧКА НА ЛИНИИ (ИКОНКА) */}
              <div className={`absolute -left-[41px] top-0 w-8 h-8 rounded-full border-4 border-gray-50 flex items-center justify-center shadow-sm z-10
                ${event.event_type === 'vaccine' ? 'bg-blue-100 text-blue-600' : 
                  event.event_type === 'medical' ? 'bg-red-100 text-red-600' :
                  event.event_type === 'parasite' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}
              `}>
                 <EventIcon type={event.event_type} />
              </div>

              {/* КАРТОЧКА СОБЫТИЯ */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                
                {/* Заголовок и Дата */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 block">
                      {event.event_type_display}
                    </span>
                    <h4 className="text-lg font-bold text-gray-900">{event.title}</h4>
                  </div>
                  <span className="text-sm font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                    {event.date}
                  </span>
                </div>

                {/* Описание */}
                {event.description && (
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {event.description}
                  </p>
                )}

                {/* ФУТЕР КАРТОЧКИ: Автор и Верификация */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                   
                   {/* Автор */}
                   <div className="flex items-center gap-2">
                      <div className="bg-gray-100 p-1.5 rounded-full">
                        {event.created_by_is_vet ? <Stethoscope size={14} className="text-blue-600"/> : <User size={14} className="text-gray-500"/>}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${event.created_by_is_vet ? 'text-blue-700' : 'text-gray-700'}`}>
                          {event.created_by_is_vet ? (event.created_by_clinic || "Ветеринар") : "Владелец"}
                        </span>
                        {event.created_by_is_vet && (
                          <span className="text-[10px] text-gray-400">{event.created_by_name}</span>
                        )}
                      </div>
                   </div>

                   {/* ЗЕЛЕНАЯ ГАЛОЧКА (Самое важное!) */}
                   {event.is_verified && (
                     <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100" title="Подтверждено врачом">
                       <CheckCircle2 size={14} />
                       <span className="text-[10px] font-bold uppercase">Подтверждено</span>
                     </div>
                   )}

                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Вспомогательный компонент для иконок
const EventIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'vaccine': return <Syringe size={14} />;
    case 'medical': return <Activity size={14} />;
    case 'parasite': return <Pill size={14} />;
    case 'measure': return <Weight size={14} />;
    default: return <FileText size={14} />;
  }
};