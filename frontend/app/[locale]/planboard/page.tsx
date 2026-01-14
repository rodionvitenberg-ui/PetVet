'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import PlanboardCard from '@/components/planboard/PlanboardCard';
import CreateHealthEventModal from '@/components/dashboard/CreateHealthEventModal';
import { HealthEvent } from '@/types/event';
import { PetBasic } from '@/types/pet';
import { Plus, Loader2, AlertCircle, Calendar, CheckCircle2, ImageIcon, Users, PawPrint } from 'lucide-react';

// === Импорты DnD ===
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { DraggableCard, DroppableColumn } from '@/components/planboard/DnDComponents';

// === Импорт нашего защитника ===
import AuthGuard from '@/components/providers/AuthGuard'; 

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getMediaUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
};

export default function PlanboardPage() {
    const { user } = useAuth();
    const [pets, setPets] = useState<PetBasic[]>([]);
    const [events, setEvents] = useState<HealthEvent[]>([]);
    
    // Локальный loading оставляем, так как это загрузка ДАННЫХ (api/pets), а не проверка юзера.
    // AuthGuard проверит юзера, а потом этот стейт покажет спиннер пока тянутся данные.
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
    const [editingEvent, setEditingEvent] = useState<HealthEvent | null>(null);

    // === ЛОГИКА ПЕРЕКЛЮЧЕНИЯ (MY vs PATIENTS) ===
    const [viewMode, setViewMode] = useState<'my' | 'patients'>('my');

    // Фильтрация списков
    const myPets = pets.filter(p => p.owner === user?.id);
    const patients = pets.filter(p => p.owner !== user?.id);

    // Авто-переключение на пациентов
    useEffect(() => {
        if (!loading && user?.is_veterinarian && myPets.length === 0 && patients.length > 0) {
            setViewMode('patients');
        }
    }, [loading, user, myPets.length, patients.length]);

    const displayedPets = viewMode === 'my' ? myPets : patients;

    // Сенсоры для DnD
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;
            const [petsRes, eventsRes] = await Promise.all([
                fetch(`${API_URL}/api/pets/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/health-events/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (petsRes.ok && eventsRes.ok) {
                const petsData = await petsRes.json();
                const eventsData = await eventsRes.json();
                setPets(petsData);
                setEvents(eventsData);
            }
        } catch (err) {
            console.error('Failed to load data', err);
        } finally {
            setLoading(false);
        }
    };

    // Загружаем данные только если user существует (хотя AuthGuard и так не пустит без него)
    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // === ОБНОВЛЕНИЕ СТАТУСА (API) ===
    const updateEventApi = async (id: number, payload: any) => {
        try {
            const token = localStorage.getItem('access_token');
            await fetch(`${API_URL}/api/health-events/${id}/`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error('Failed to update event', err);
            fetchData(); 
        }
    };

    // === ЛОГИКА ПЕРЕТАСКИВАНИЯ (DragEnd) ===
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) return;

        const eventId = Number(active.id.toString().replace('event-', ''));
        const [targetType, , petIdStr] = over.id.toString().split('-'); 
        
        const currentEvent = events.find(e => e.id === eventId);
        if (!currentEvent) return;

        if (currentEvent.pet.id.toString() !== petIdStr) {
             return; 
        }

        let newStatus = currentEvent.status;
        let isCompleted = currentEvent.is_completed;
        let newDate = currentEvent.date;

        const now = new Date();

        if (targetType === 'history') {
            newStatus = 'completed';
            isCompleted = true;
        } else if (targetType === 'urgent') {
            newStatus = 'planned'; 
            isCompleted = false;
            newDate = now.toISOString(); 
        } else if (targetType === 'plans') {
            newStatus = 'planned'; 
            isCompleted = false;
            
            const eventDate = new Date(currentEvent.date);
            const urgentThreshold = new Date();
            urgentThreshold.setDate(now.getDate() + 3);
            
            if (eventDate <= urgentThreshold) {
                const futureDate = new Date();
                futureDate.setDate(now.getDate() + 4); 
                newDate = futureDate.toISOString();
            }
        }

        setEvents(prev => prev.map(e => {
            if (e.id === eventId) {
                return { ...e, status: newStatus, is_completed: isCompleted, date: newDate };
            }
            return e;
        }));

        updateEventApi(eventId, {
            status: newStatus,
            is_completed: isCompleted,
            date: newDate.replace('T', ' ').slice(0, 16) 
        });
    };

    const handleCreateClick = (petId: number) => {
        setSelectedPetId(petId);
        setEditingEvent(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (event: HealthEvent) => {
        setSelectedPetId(event.pet.id);
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    const handleToggleStatus = (id: number, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        setEvents(prev => prev.map(e => 
            e.id === id ? { ...e, is_completed: newStatus, status: newStatus ? 'completed' : 'planned' } : e
        ));
        updateEventApi(id, { 
            is_completed: newStatus,
            status: newStatus ? 'completed' : 'planned' 
        });
    };

    // Этот блок if(loading) мы оставляем, он отвечает за спиннер ЗАГРУЗКИ ДАННЫХ
    // AuthGuard отработает ДО него и покажет спиннер АВТОРИЗАЦИИ
    if (loading) {
        return (
            <AuthGuard>
                <div className="min-h-screen pt-24 flex justify-center items-start">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            </AuthGuard>
        );
    }

    const now = new Date();
    const urgentThreshold = new Date();
    urgentThreshold.setDate(now.getDate() + 3);
    urgentThreshold.setHours(23, 59, 59, 999);

    return (
        <AuthGuard>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="min-h-screen bg-gray-50/50 pt-24 pb-10 px-4 sm:px-6">
                    <div className="max-w-[1600px] mx-auto">
                        
                        {/* ХЕДЕР С ПЕРЕКЛЮЧАТЕЛЕМ */}
                        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                    {viewMode === 'my' ? 'График процедур и назначений' : 'Контроль назначений и процедур пациентов'}
                                </h1>
                            </div>

                            {user?.is_veterinarian && (
                                <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm self-start md:self-auto">
                                    <button
                                        onClick={() => setViewMode('my')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                                            viewMode === 'my' 
                                            ? 'bg-blue-50 text-blue-600 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <PawPrint size={16} /> Личные
                                    </button>
                                    <button
                                        onClick={() => setViewMode('patients')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                                            viewMode === 'patients' 
                                            ? 'bg-emerald-50 text-emerald-600 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        <Users size={16} /> Пациенты
                                        {patients.length > 0 && (
                                            <span className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 rounded-full">
                                                {patients.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </header>

                        {/* Заголовки таблицы (Desktop) */}
                        <div className="hidden md:grid grid-cols-[180px_1fr_1fr_1fr] gap-6 mb-4 px-4">
                            <div></div> 
                            <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-wider pl-1">
                                <AlertCircle size={16} /> Внимание (3 дня)
                            </div>
                            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-wider pl-1">
                                <Calendar size={16} /> Планы
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 font-bold text-sm uppercase tracking-wider pl-1">
                                <CheckCircle2 size={16} /> История
                            </div>
                        </div>

                        <div className="space-y-12 md:space-y-8">
                            {displayedPets.map(pet => {
                                const petEvents = events.filter(e => e.pet.id === pet.id);
                                const mainImage = pet.images?.find(img => img.is_main)?.image || pet.images?.[0]?.image;

                                // Фильтрация событий
                                const historyEvents = petEvents.filter(e => 
                                    e.is_completed || e.status === 'completed' || e.status === 'cancelled'
                                ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

                                const activeEvents = petEvents.filter(e => 
                                    !e.is_completed && e.status !== 'completed' && e.status !== 'cancelled'
                                );

                                const urgentEvents = activeEvents.filter(e => new Date(e.date) <= urgentThreshold)
                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                const upcomingEvents = activeEvents.filter(e => new Date(e.date) > urgentThreshold)
                                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                return (
                                    <div key={pet.id} className="bg-white md:bg-transparent rounded-3xl md:rounded-none shadow-sm md:shadow-none p-5 md:p-0 border border-gray-100 md:border-none">
                                        
                                        <div className="md:grid md:grid-cols-[180px_1fr_1fr_1fr] gap-6 items-start">
                                            
                                            {/* 1. ПИТОМЕЦ */}
                                            <div className="flex md:flex-col items-center md:items-start gap-4 mb-6 md:mb-0 md:pt-6">
                                                <div className="w-16 h-16 md:w-full md:h-40 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 shadow-sm relative group">
                                                    {mainImage ? (
                                                        <img src={getMediaUrl(mainImage)!} alt={pet.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-gray-50"><ImageIcon size={32} /></div>
                                                    )}
                                                    
                                                    {/* Бейдж владельца для режима пациентов */}
                                                    {viewMode === 'patients' && (
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">
                                                            {pet.owner_info?.is_temporary ? "Врем: " : "Вл: "}
                                                            {pet.owner_info?.name || pet.temp_owner_name}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-full">
                                                    <h3 className="font-bold text-xl text-gray-900 leading-tight">{pet.name}</h3>
                                                    <button onClick={() => handleCreateClick(pet.id)} className="mt-2 w-full text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 px-3 rounded-lg transition flex items-center justify-center gap-2">
                                                        <Plus size={14} /> Добавить запись
                                                    </button>
                                                </div>
                                            </div>

                                            {/* 2. ВНИМАНИЕ (Droppable) */}
                                            <DroppableColumn 
                                                id={`urgent-pet-${pet.id}`} 
                                                className="md:bg-white md:rounded-3xl md:p-4 md:min-h-[160px] md:border md:border-red-100 mb-6 md:mb-0 md:shadow-sm h-full"
                                            >
                                                <div className="md:hidden font-bold text-red-500 text-xs uppercase mb-3 flex items-center gap-2">
                                                    <AlertCircle size={14} /> Внимание
                                                </div>
                                                <div className="space-y-3 min-h-[50px]">
                                                    {urgentEvents.map(ev => (
                                                        <DraggableCard key={ev.id} id={ev.id}>
                                                            <div onClick={() => handleEditClick(ev)}>
                                                                <PlanboardCard event={ev} onToggle={handleToggleStatus} variant="urgent" />
                                                            </div>
                                                        </DraggableCard>
                                                    ))}
                                                    {urgentEvents.length === 0 && (
                                                        <div className="hidden md:flex h-20 items-center justify-center text-gray-300 text-xs text-center border-2 border-dashed border-gray-100 rounded-2xl">
                                                            <span>Нет срочных дел</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </DroppableColumn>

                                            {/* 3. ПЛАНЫ (Droppable) */}
                                            <DroppableColumn 
                                                id={`plans-pet-${pet.id}`} 
                                                className="md:bg-white md:rounded-3xl md:p-4 md:min-h-[160px] md:border md:border-gray-100 mb-6 md:mb-0 md:shadow-sm h-full"
                                            >
                                                <div className="md:hidden font-bold text-blue-500 text-xs uppercase mb-3 flex items-center gap-2">
                                                    <Calendar size={14} /> Планы
                                                </div>
                                                <div className="space-y-3 min-h-[50px]">
                                                    {upcomingEvents.map(ev => (
                                                        <DraggableCard key={ev.id} id={ev.id}>
                                                            <div onClick={() => handleEditClick(ev)}>
                                                                <PlanboardCard event={ev} onToggle={handleToggleStatus} />
                                                            </div>
                                                        </DraggableCard>
                                                    ))}
                                                    {upcomingEvents.length === 0 && (
                                                        <div className="hidden md:flex h-20 items-center justify-center text-gray-300 text-xs text-center">
                                                            <span>Планов пока нет</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </DroppableColumn>

                                            {/* 4. ИСТОРИЯ (Droppable) */}
                                            <DroppableColumn 
                                                id={`history-pet-${pet.id}`} 
                                                className="md:bg-gray-50/50 md:rounded-3xl md:p-4 md:min-h-[160px] md:border md:border-gray-100/50 h-full"
                                            >
                                                <div className="md:hidden font-bold text-gray-400 text-xs uppercase mb-3 flex items-center gap-2">
                                                    <CheckCircle2 size={14} /> История
                                                </div>
                                                <div className="space-y-3 min-h-[50px]">
                                                    {historyEvents.map(ev => (
                                                        <DraggableCard key={ev.id} id={ev.id}>
                                                            <div onClick={() => handleEditClick(ev)}>
                                                                <PlanboardCard event={ev} onToggle={handleToggleStatus} variant="completed" />
                                                            </div>
                                                        </DraggableCard>
                                                    ))}
                                                    {historyEvents.length === 0 && (
                                                        <div className="hidden md:flex h-20 items-center justify-center text-gray-300 text-xs text-center">
                                                            <span>Пусто</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </DroppableColumn>
                                        </div>
                                        <div className="md:hidden h-px bg-gray-100 mt-6 mx-2" />
                                    </div>
                                );
                            })}
                            
                            {displayedPets.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-400">В этом списке пока нет животных</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {isModalOpen && selectedPetId && (
                        <CreateHealthEventModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSuccess={fetchData}
                            petId={selectedPetId}
                            initialData={editingEvent}
                        />
                    )}
                </div>
            </DndContext>
        </AuthGuard>
    );
}