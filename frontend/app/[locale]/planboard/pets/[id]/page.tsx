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
        <div className="min-h-screen bg-muted pt-20 pb-10 px-4">
            <div className="max-w-6xl mx-auto">
                
                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full transition">
                            <ArrowLeft />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                Medical History: {pet.name}
                                <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    {pet.species || 'Pet'}
                                </span>
                            </h1>
                            <p className="text-muted-foreground text-sm">Owner: {pet.owner_info?.name || pet.temp_owner_name}</p>
                        </div>
                    </div>

                    {/* Кнопка добавления прямо из истории */}
                    <button 
                        onClick={handleCreateClick}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary transition shadow-lg shadow-primary/20"
                    >
                        <Plus size={18} /> Add Event
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
                    
                    {/* SIDEBAR (Инфо + Файлы) */}
                    <div className="space-y-6 sticky top-24">
                        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                            <div className="w-full aspect-square bg-muted rounded-xl mb-4 overflow-hidden">
                                {pet.images?.[0] ? (
                                    <img src={pet.images[0].image} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Нет фото</div>
                                )}
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Age</span>
                                    <span className="font-bold">{pet.age || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Gender</span>
                                    <span className="font-bold">{pet.gender === 'M' ? 'Male' : 'Female'}</span>
                                </div>
                                <div className="pt-3 border-t border-border">
                                    <div className="text-xs font-bold text-muted-foreground uppercase mb-1">Notes</div>
                                    <p className="text-muted-foreground italic text-xs leading-relaxed">{pet.description || 'No notes'}</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* [UPD] СПИСОК ВСЕХ ФАЙЛОВ */}
                        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
                            <h3 className="font-bold mb-4 flex items-center gap-2 text-foreground">
                                <Paperclip size={18} className="text-primary"/> Documents ({allAttachments.length})
                            </h3>
                            
                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                {allAttachments.length > 0 ? allAttachments.map((att, idx) => (
                                    <a 
                                        key={att.id || idx} 
                                        href={att.file} 
                                        target="_blank"
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition group border border-transparent hover:border-border"
                                    >
                                        <div className="bg-primary/10 text-primary p-2 rounded-lg shrink-0">
                                            <FileText size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-foreground truncate">
                                                {att.file.split('/').pop()}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {new Date(att.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <Download size={14} className="text-muted-foreground group-hover:text-primary" />
                                    </a>
                                )) : (
                                    <div className="text-sm text-muted-foreground italic text-center py-4">No attached files</div>
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
                                    <span className="bg-white/80 backdrop-blur text-foreground px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border border-border">
                                        {month}
                                    </span>
                                </div>

                                <div className="space-y-6 pl-4 border-l-2 border-border ml-3">
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
                                                    ${isCompleted ? 'bg-success/100' : 'bg-primary'}`}
                                                >
                                                </div>

                                                <div className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow relative">
                                                    
                                                    {/* [UPD] Кнопка Редактирования */}
                                                    <button 
                                                        onClick={() => handleEditClick(ev)}
                                                        className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition"
                                                        title="Edit Event"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>

                                                    <div className="flex justify-between items-start mb-3 pr-8">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2.5 rounded-xl ${ev.event_type?.category === 'medical' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                                                <Icon size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-foreground text-lg leading-tight">{ev.title}</h4>
                                                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 font-medium">
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
                                                            ${ev.status === 'completed' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}
                                                        >
                                                            {ev.status === 'completed' ? 'Completed' : 'Scheduled'}
                                                        </span>
                                                    </div>

                                                    {ev.description && (
                                                        <div className="text-foreground text-sm bg-muted/50 p-4 rounded-xl whitespace-pre-line leading-relaxed border border-border">
                                                            {ev.description}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Вложения карточки */}
                                                    {ev.attachments && ev.attachments.length > 0 && (
                                                        <div className="mt-4 pt-3 border-t border-border flex gap-2 overflow-x-auto pb-1">
                                                            {ev.attachments.map((att, i) => (
                                                                <a 
                                                                    key={i} 
                                                                    href={att.file} 
                                                                    target="_blank" 
                                                                    className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/15 transition border border-primary/15/50"
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
                            <div className="text-center py-20 bg-card rounded-3xl border-2 border-dashed border-border">
                                <Activity size={48} className="mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground font-medium">Disease history is currently empty</p>
                                <button 
                                    onClick={handleCreateClick}
                                    className="mt-4 text-primary font-bold text-sm hover:underline"
                                >
                                    Create first record
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Модальное окно редактирования/создания */}
            {pet && isModalOpen && (
                <CreateEventModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchData} 
                    petId={pet.id}
                    initialData={editingEvent}
                />
            )}
        </div>
    );
}