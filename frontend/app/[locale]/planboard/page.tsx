'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; 
import Link from 'next/link'; 
import { useAuth } from '@/components/providers/AuthProvider';
import PlanboardCard from '@/components/planboard/PlanboardCard';
import CreateEventModal from '@/components/dashboard/CreateEventModal';
import TimeModal from '@/components/planboard/TimeModal';
import PlanModal from '@/components/planboard/PlanModal';
import { PetEvent } from '@/types/event';
import { PetBasic } from '@/types/pet';
import { Plus, Loader2, AlertCircle, Calendar, CheckCircle2, ImageIcon, Users, PawPrint, LayoutGrid, List, FileText, Receipt } from 'lucide-react'; 
import { DndContext, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { DraggableCard, DroppableColumn } from '@/components/planboard/DnDComponents';

import SearchInput from '@/components/ui/SearchInput';
import PetFilters from '@/components/dashboard/PetFilters';
import EventFilter from '@/components/planboard/EventFilter';
import AuthGuard from '@/components/providers/AuthGuard'; // [1] Импортируем AuthGuard

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getMediaUrl = (url: string | undefined | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
};

export default function PlanboardPage() {
    const { user } = useAuth();
    const router = useRouter(); 
    const searchParams = useSearchParams();
    
    const [pets, setPets] = useState<PetBasic[]>([]);
    const [events, setEvents] = useState<PetEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

    // Modals state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
    const [editingEvent, setEditingEvent] = useState<PetEvent | null>(null);
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [pendingDragEvent, setPendingDragEvent] = useState<number | null>(null);

    const [notifiedEvents, setNotifiedEvents] = useState<Set<number>>(new Set());
    const [viewMode, setViewMode] = useState<'my' | 'patients'>('my');

    // === 1. БАЗОВАЯ ФИЛЬТРАЦИЯ (Поиск, Вид, Пол) ===
    const filteredPets = useMemo(() => {
        const query = searchParams.get('search')?.toLowerCase() || "";
        const gender = searchParams.get('gender');
        const species = searchParams.get('species');

        return pets.filter(p => {
            // Поиск (Имя, Владелец)
            if (query) {
                const matchName = p.name.toLowerCase().includes(query);
                const matchOwner = p.owner_info?.name?.toLowerCase().includes(query);
                const matchTemp = p.temp_owner_name?.toLowerCase().includes(query);
                if (!matchName && !matchOwner && !matchTemp) return false;
            }
            // Пол
            if (gender && p.gender !== gender) return false;
            
            // Вид
            if (species) {
                const hasCategory = p.categories?.some(c => c.slug === species);
                if (!hasCategory) return false;
            }
            return true;
        });
    }, [pets, searchParams]);

    // Разделяем списки
    const myPets = filteredPets.filter(p => p.owner === user?.id);
    const patients = filteredPets.filter(p => p.owner !== user?.id);

    useEffect(() => {
        if (!loading && user?.is_veterinarian && myPets.length === 0 && patients.length > 0) {
            setViewMode('patients');
        }
    }, [loading, user, myPets.length, patients.length]);

    const displayedPets = viewMode === 'my' ? myPets : patients;
    
    // Получаем текущий фильтр по типу задачи из URL
    const eventTypeFilter = searchParams.get('eventType');

    // === 2. УМНАЯ ФИЛЬТРАЦИЯ (visiblePets) ===
    const visiblePets = useMemo(() => {
        if (!eventTypeFilter) return displayedPets;

        return displayedPets.filter(pet => {
            return events.some(e => {
                const eid = (typeof e.pet === 'object' && e.pet) ? (e.pet as any).id : e.pet;
                if (Number(eid) !== Number(pet.id)) return false;
                return e.event_type?.slug === eventTypeFilter;
            });
        });
    }, [displayedPets, events, eventTypeFilter]);


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
                fetch(`${API_URL}/api/events/`, { headers: { 'Authorization': `Bearer ${token}` } })
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

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // Уведомления
    useEffect(() => {
        const checkNotifications = () => {
            const now = new Date();
            events.forEach(event => {
                if (event.status === 'completed' || event.status === 'missed') return;
                const eventDate = new Date(event.date);
                const diffMs = eventDate.getTime() - now.getTime();
                const diffMinutes = Math.floor(diffMs / 60000);

                if (diffMinutes >= 0 && diffMinutes <= 15 && !notifiedEvents.has(event.id)) {
                    const audio = new Audio('/notification.mp3'); 
                    audio.play().catch(() => {});
                    if (Notification.permission === 'granted') {
                        new Notification(`Напоминание: ${event.title}`, { body: `Через ${diffMinutes} мин.` });
                    }
                    setNotifiedEvents(prev => new Set(prev).add(event.id));
                }
            });
        };
        const interval = setInterval(checkNotifications, 60000); 
        return () => clearInterval(interval);
    }, [events, notifiedEvents]);

    const updateEventApi = async (id: number, payload: any) => {
        try {
            const token = localStorage.getItem('access_token');
            await fetch(`${API_URL}/api/events/${id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error('Failed to update event', err);
            fetchData(); 
        }
    };

    const handleTodayTimeConfirm = (selectedDate: Date) => {
        if (!pendingDragEvent) return;
        setEvents(prev => prev.map(e => e.id === pendingDragEvent ? { ...e, status: 'planned', date: selectedDate.toISOString() } : e));
        updateEventApi(pendingDragEvent, { status: 'planned', date: selectedDate.toISOString().replace('T', ' ').slice(0, 16) });
        setIsTimeModalOpen(false);
        setPendingDragEvent(null);
    };

    const handlePlanDateConfirm = (selectedDate: Date) => {
        if (!pendingDragEvent) return;
        setEvents(prev => prev.map(e => e.id === pendingDragEvent ? { ...e, status: 'planned', date: selectedDate.toISOString() } : e));
        updateEventApi(pendingDragEvent, { status: 'planned', date: selectedDate.toISOString().replace('T', ' ').slice(0, 16) });
        setIsPlanModalOpen(false);
        setPendingDragEvent(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const eventId = Number(active.id.toString().replace('event-', ''));
        const [targetType, , petIdStr] = over.id.toString().split('-'); 
        
        const currentEvent = events.find(e => e.id === eventId);
        if (!currentEvent) return;

        const eventPetId = (typeof currentEvent.pet === 'object' && currentEvent.pet !== null) ? (currentEvent.pet as any).id : currentEvent.pet;
        if (String(eventPetId) !== petIdStr) return; 

        if (targetType === 'urgent') { 
            setPendingDragEvent(eventId); setIsTimeModalOpen(true); return;
        }
        if (targetType === 'plans') {
            setPendingDragEvent(eventId); setIsPlanModalOpen(true); return;
        }
        if (targetType === 'history') {
            setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: 'completed' } : e));
            updateEventApi(eventId, { status: 'completed' });
        }
    };

    const handleCreateClick = (petId: number) => {
        setSelectedPetId(petId);
        setEditingEvent(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (event: PetEvent) => {
        const petId = (typeof event.pet === 'object' && event.pet !== null) ? (event.pet as any).id : event.pet;
        setSelectedPetId(Number(petId));
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    const handleToggleStatus = (id: number, isCompleted: boolean) => {
        const newStatus = isCompleted ? 'planned' : 'completed';
        setEvents(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
        updateEventApi(id, { status: newStatus });
    };

    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const isCompact = density === 'compact';

    // [2] Убрали ранний return (if loading), перенесли логику внутрь AuthGuard
    return (
        <AuthGuard>
            {loading ? (
                <div className="min-h-screen pt-24 flex justify-center items-center">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            ) : (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div className="min-h-screen bg-gray-50/50 pt-24 pb-10 px-4 sm:px-6">
                        <div className="max-w-[1920px] mx-auto">
                            
                            <header className="flex flex-col gap-5 mb-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                            {viewMode === 'my' ? 'Мои задачи' : 'Стационар'}
                                            <span className="text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                                {visiblePets.length}
                                            </span>
                                        </h1>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
                                            <button onClick={() => setDensity('comfortable')} className={`p-2 rounded-md transition-all ${!isCompact ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={18} /></button>
                                            <button onClick={() => setDensity('compact')} className={`p-2 rounded-md transition-all ${isCompact ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}><List size={18} /></button>
                                        </div>

                                        {user?.is_veterinarian && (
                                            <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
                                                <button onClick={() => setViewMode('my')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'my' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><PawPrint size={14} /> Личные</button>
                                                <button onClick={() => setViewMode('patients')} className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'patients' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}><Users size={14} /> Пациенты</button>
                                            </div>
                                        )}

                                        <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
                                            <Link 
                                                href="/billing/invoices"
                                                className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                            >
                                                <Receipt size={14} /> <span className="hidden sm:inline">Счета</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Панель фильтров */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                     <SearchInput placeholder={viewMode === 'my' ? "Поиск..." : "Поиск по стационару..."} />
                                     <PetFilters />
                                     <EventFilter />
                                </div>
                            </header>

                            <div className={`hidden md:grid gap-4 mb-2 px-2 sticky top-20 z-10 bg-gray-50/95 backdrop-blur py-2 border-b border-gray-200
                                ${isCompact ? 'grid-cols-[120px_1fr_1fr_1fr]' : 'grid-cols-[180px_1fr_1fr_1fr]'}`}
                            >
                                <div className="text-xs font-bold text-gray-400 uppercase">Пациент</div> 
                                <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase pl-1"><AlertCircle size={14} /> Сегодня</div>
                                <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase pl-1"><Calendar size={14} /> Планы</div>
                                <div className="flex items-center gap-2 text-gray-500 font-bold text-xs uppercase pl-1"><CheckCircle2 size={14} /> История</div>
                            </div>

                            <div className={isCompact ? "space-y-1" : "space-y-8"}>
                                {visiblePets.map(pet => {
                                    const petEvents = events.filter(e => {
                                        const eid = (typeof e.pet === 'object' && e.pet) ? (e.pet as any).id : e.pet;
                                        if (Number(eid) !== Number(pet.id)) return false;
                                        
                                        if (eventTypeFilter && e.event_type.slug !== eventTypeFilter) return false;
                                        
                                        return true;
                                    });
                                    
                                    const mainImage = pet.images?.find(img => img.is_main)?.image || pet.images?.[0]?.image;

                                    const historyEvents = petEvents.filter(e => e.status === 'completed' || e.status === 'missed')
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
                                    const activeEvents = petEvents.filter(e => e.status !== 'completed' && e.status !== 'missed');
                                    const todayEvents = activeEvents.filter(e => new Date(e.date) <= endOfToday)
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                                    const futureEvents = activeEvents.filter(e => new Date(e.date) > endOfToday)
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                    return (
                                        <div key={pet.id} className={`bg-white rounded-xl border border-gray-200 transition-all hover:border-blue-300
                                            ${isCompact ? 'py-2 px-2 shadow-sm' : 'p-5 shadow-sm'}`}
                                        >
                                            <div className={`md:grid gap-4 items-start
                                                ${isCompact ? 'grid-cols-[120px_1fr_1fr_1fr]' : 'grid-cols-[180px_1fr_1fr_1fr]'}`}
                                            >
                                                
                                                {/* ПИТОМЕЦ */}
                                                <div className={`flex items-center gap-3 ${isCompact ? 'flex-row' : 'md:flex-col md:items-start'}`}>
                                                    <div 
                                                        onClick={() => router.push(`/planboard/pets/${pet.id}`)}
                                                        className={`shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group cursor-pointer
                                                        ${isCompact ? 'w-10 h-10' : 'w-16 h-16 md:w-full md:h-32'}`}
                                                    >
                                                        {mainImage ? (
                                                            <img src={getMediaUrl(mainImage)!} className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={isCompact?16:32} /></div>
                                                        )}
                                                        
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                                                            <FileText className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={24} />
                                                        </div>

                                                        {!isCompact && viewMode === 'patients' && (
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate pointer-events-none">
                                                                {pet.owner_info?.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="min-w-0">
                                                        <h3 className={`font-bold text-gray-900 leading-tight truncate ${isCompact ? 'text-sm' : 'text-lg'}`}>
                                                            {pet.name}
                                                        </h3>
                                                        
                                                        <button 
                                                            onClick={() => handleCreateClick(pet.id)} 
                                                            className={`mt-1 flex items-center gap-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition
                                                            ${isCompact ? 'p-1' : 'w-full py-2 px-3 justify-center mt-2'}`}
                                                            title="Добавить запись"
                                                        >
                                                            <Plus size={isCompact ? 14 : 16} /> 
                                                            {!isCompact && <span className="text-xs font-bold">Добавить</span>}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* СЕГОДНЯ */}
                                                <DroppableColumn id={`urgent-pet-${pet.id}`} className={`rounded-xl h-full border transition-colors ${isCompact ? 'bg-gray-50/50 p-1 min-h-[60px] border-transparent' : 'bg-white p-3 min-h-[140px] border-red-50'}`}>
                                                    <div className="space-y-2">
                                                        {todayEvents.map(ev => (
                                                            <DraggableCard key={ev.id} id={ev.id}>
                                                                <div onClick={() => handleEditClick(ev)} className={new Date(ev.date) < now ? "ring-1 ring-red-400 rounded-lg" : ""}>
                                                                    <PlanboardCard event={ev} onToggle={handleToggleStatus} variant="urgent" compact={isCompact} />
                                                                </div>
                                                            </DraggableCard>
                                                        ))}
                                                    </div>
                                                </DroppableColumn>

                                                {/* ПЛАНЫ */}
                                                <DroppableColumn id={`plans-pet-${pet.id}`} className={`rounded-xl h-full border transition-colors ${isCompact ? 'bg-gray-50/50 p-1 min-h-[60px] border-transparent' : 'bg-white p-3 min-h-[140px] border-gray-100'}`}>
                                                    <div className="space-y-2">
                                                        {futureEvents.map(ev => (
                                                            <DraggableCard key={ev.id} id={ev.id}>
                                                                <div onClick={() => handleEditClick(ev)}>
                                                                    <PlanboardCard event={ev} onToggle={handleToggleStatus} compact={isCompact} />
                                                                </div>
                                                            </DraggableCard>
                                                        ))}
                                                    </div>
                                                </DroppableColumn>

                                                {/* ИСТОРИЯ */}
                                                <DroppableColumn id={`history-pet-${pet.id}`} className={`rounded-xl h-full border transition-colors ${isCompact ? 'bg-gray-50/50 p-1 min-h-[60px] border-transparent' : 'bg-gray-50/50 p-3 min-h-[140px] border-gray-100/50'}`}>
                                                    <div className="space-y-2">
                                                        {historyEvents.map(ev => (
                                                            <DraggableCard key={ev.id} id={ev.id}>
                                                                <div onClick={() => handleEditClick(ev)}>
                                                                    <PlanboardCard event={ev} onToggle={handleToggleStatus} variant="completed" compact={isCompact} />
                                                                </div>
                                                            </DraggableCard>
                                                        ))}

                                                        {petEvents.filter(e => e.status === 'completed' || e.status === 'missed').length > 5 && (
                                                            <button 
                                                                onClick={() => router.push(`/planboard/pets/${pet.id}`)}
                                                                className="w-full text-xs text-center text-gray-400 hover:text-blue-500 py-2 transition font-medium border-t border-gray-100 mt-2"
                                                            >
                                                                Показать всю историю →
                                                            </button>
                                                        )}
                                                    </div>
                                                </DroppableColumn>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {visiblePets.length === 0 && (
                                     <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                                        <Users size={48} className="mx-auto mb-3 opacity-50" />
                                        {searchParams.toString().length > 0 ? (
                                            <p>Ничего не найдено. Попробуйте изменить фильтры.</p>
                                        ) : (
                                            <p>В стационаре пока пусто.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {isModalOpen && selectedPetId && (
                            <CreateEventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchData} petId={selectedPetId} initialData={editingEvent} />
                        )}
                        <TimeModal isOpen={isTimeModalOpen} onClose={() => { setIsTimeModalOpen(false); setPendingDragEvent(null); }} onConfirm={handleTodayTimeConfirm} />
                        <PlanModal isOpen={isPlanModalOpen} onClose={() => { setIsPlanModalOpen(false); setPendingDragEvent(null); }} onConfirm={handlePlanDateConfirm} />
                    </div>
                </DndContext>
            )}
        </AuthGuard>
    );
}