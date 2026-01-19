'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, CheckCircle2, Clock, AlertCircle, Paperclip, Activity, Syringe, Scissors, Edit2, Plus, Download } from 'lucide-react';
import { PetDetail } from '@/types/pet';
import { PetEvent } from '@/types/event';
import CreateEventModal from '@/components/dashboard/CreateEventModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PetMedicalHistoryPage() {
    const params = useParams();
    const router = useRouter();
    
    // Данные
    const [pet, setPet] = useState<PetDetail | null>(null);
    const [events, setEvents] = useState<PetEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Модалка
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<PetEvent | null>(null);

    // Функция загрузки данных (вынесена, чтобы вызывать после onSuccess)
    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            // 1. Грузим питомца
            const petRes = await fetch(`${API_URL}/api/pets/${params.id}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const petData = await petRes.json();
            setPet(petData);

            // 2. Грузим ВСЕ его события
            const eventsRes = await fetch(`${API_URL}/api/events/?pet=${params.id}&ordering=-date`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const eventsData = await eventsRes.json();
            setEvents(eventsData);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Хендлеры
    const handleCreateClick = () => {
        setEditingEvent(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (event: PetEvent) => {
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    if (loading || !pet) return <div className="p-10 text-center">Загрузка истории...</div>;

    // Группировка событий по месяцам
    const groupedEvents = events.reduce((acc, event) => {
        const date = new Date(event.date);
        const key = date.toLocaleString('ru', { month: 'long', year: 'numeric' });
        if (!acc[key]) acc[key] = [];
        acc[key].push(event);
        return acc;
    }, {} as Record<string, PetEvent[]>);

    // [UPD] Агрегация всех файлов со всех событий
    const allAttachments = events.flatMap(ev => ev.attachments || []);

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-10 px-4">
            <div className="max-w-6xl mx-auto">
                
                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full transition">
                            <ArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                История болезни: {pet.name}
                                <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                    {pet.species || 'Питомец'}
                                </span>
                            </h1>
                            <p className="text-gray-500 text-sm">Владелец: {pet.owner_info?.name || pet.temp_owner_name}</p>
                        </div>
                    </div>

                    {/* Кнопка добавления прямо из истории */}
                    <button 
                        onClick={handleCreateClick}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                    >
                        <Plus size={18} /> Добавить запись
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
                    
                    {/* SIDEBAR (Инфо + Файлы) */}
                    <div className="space-y-6 sticky top-24">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="w-full aspect-square bg-gray-100 rounded-xl mb-4 overflow-hidden">
                                {pet.images?.[0] ? (
                                    <img src={pet.images[0].image} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">Нет фото</div>
                                )}
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Возраст</span>
                                    <span className="font-bold">{pet.age || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Пол</span>
                                    <span className="font-bold">{pet.gender === 'M' ? 'Самец' : 'Самка'}</span>
                                </div>
                                <div className="pt-3 border-t border-gray-100">
                                    <div className="text-xs font-bold text-gray-400 uppercase mb-1">Заметки</div>
                                    <p className="text-gray-600 italic text-xs leading-relaxed">{pet.description || 'Нет заметок'}</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* [UPD] СПИСОК ВСЕХ ФАЙЛОВ */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
                                <Paperclip size={18} className="text-blue-500"/> Документы ({allAttachments.length})
                            </h3>
                            
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                {allAttachments.length > 0 ? allAttachments.map((att, idx) => (
                                    <a 
                                        key={att.id || idx} 
                                        href={att.file} 
                                        target="_blank"
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition group border border-transparent hover:border-gray-100"
                                    >
                                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg shrink-0">
                                            <FileText size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-gray-700 truncate">
                                                {att.file.split('/').pop()}
                                            </div>
                                            <div className="text-[10px] text-gray-400">
                                                {new Date(att.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <Download size={14} className="text-gray-300 group-hover:text-blue-500" />
                                    </a>
                                )) : (
                                    <div className="text-sm text-gray-400 italic text-center py-4">Нет прикрепленных файлов</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* TIMELINE */}
                    <div className="space-y-8 pb-20">
                        {Object.entries(groupedEvents).map(([month, monthEvents]) => (
                            <div key={month} className="relative">
                                {/* Метка месяца */}
                                <div className="sticky top-20 z-10 mb-6">
                                    <span className="bg-white/80 backdrop-blur text-gray-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border border-gray-200">
                                        {month}
                                    </span>
                                </div>

                                <div className="space-y-6 pl-4 border-l-2 border-gray-200 ml-3">
                                    {monthEvents.map(ev => {
                                        const isCompleted = ev.status === 'completed';
                                        
                                        // Иконка в зависимости от типа
                                        let Icon = Activity;
                                        if (ev.event_type?.category === 'medical') Icon = Syringe;
                                        if (ev.event_type?.category === 'care') Icon = Scissors;

                                        return (
                                            <div key={ev.id} className="relative pl-8 group">
                                                {/* Точка на линии */}
                                                <div className={`absolute -left-[23px] top-5 w-5 h-5 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center z-0
                                                    ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                                >
                                                </div>

                                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative">
                                                    
                                                    {/* [UPD] Кнопка Редактирования */}
                                                    <button 
                                                        onClick={() => handleEditClick(ev)}
                                                        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        title="Редактировать запись"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>

                                                    <div className="flex justify-between items-start mb-3 pr-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2.5 rounded-xl ${ev.event_type?.category === 'medical' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                                                <Icon size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900 text-lg leading-tight">{ev.title}</h4>
                                                                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1 font-medium">
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar size={12}/> {new Date(ev.date).toLocaleDateString()}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock size={12}/> {new Date(ev.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Статус */}
                                                    <div className="mb-4">
                                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide
                                                            ${ev.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}
                                                        >
                                                            {ev.status === 'completed' ? 'Выполнено' : 'Запланировано'}
                                                        </span>
                                                    </div>

                                                    {ev.description && (
                                                        <div className="text-gray-700 text-sm bg-gray-50/50 p-4 rounded-xl whitespace-pre-line leading-relaxed border border-gray-100">
                                                            {ev.description}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Вложения карточки */}
                                                    {ev.attachments && ev.attachments.length > 0 && (
                                                        <div className="mt-4 pt-3 border-t border-gray-50 flex gap-2 overflow-x-auto pb-1">
                                                            {ev.attachments.map((att, i) => (
                                                                <a 
                                                                    key={i} 
                                                                    href={att.file} 
                                                                    target="_blank" 
                                                                    className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition border border-blue-100/50"
                                                                >
                                                                    <Paperclip size={12}/> 
                                                                    {att.file.split('/').pop()}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {events.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                                <Activity size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500 font-medium">История болезни пока пуста</p>
                                <button 
                                    onClick={handleCreateClick}
                                    className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                                >
                                    Создать первую запись
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Модальное окно редактирования/создания */}
            {pet && (
                <CreateEventModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchData} // Перезагружаем данные после сохранения
                    petId={pet.id}
                    initialData={editingEvent} // Передаем данные для редактирования
                />
            )}
        </div>
    );
}