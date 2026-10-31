'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// 1. ИСПРАВЛЕННЫЕ ИМПОРТЫ (Named exports)
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ru, enGB } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Loader2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import CreateCalendarEventModal from '@/components/calendar/CreateCalendarEventModal';
import AuthGuard from '@/components/providers/AuthGuard'; // [1] Импортируем AuthGuard

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Настройка локалей
const locales = {
  'ru': ru,
  'en-GB': enGB, // Европа любит понедельники!
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Тип события
interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource?: any;
    isGuest: boolean;
    status: string;
}

export default function CalendarPage() {
    const { user } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    
    const [loading, setLoading] = useState(false);
    
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState<View>(Views.MONTH);

    // Модалки
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [editingEvent, setEditingEvent] = useState<any>(null);

    // Динамическая культура: 'ru' или 'en-GB' по языку браузера
    const culture = useMemo(() =>
        (typeof navigator !== 'undefined' && navigator.language.startsWith('ru')) ? 'ru' : 'en-GB',
    []);

    const fetchEvents = useCallback(async (currentDate: Date, currentView: View) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Берем диапазон с запасом
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            
            // Корректировка для недели (захватываем соседние месяцы)
            startDate.setDate(startDate.getDate() - 7); 
            endDate.setDate(endDate.getDate() + 7);

            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];

            const res = await fetch(`${API_URL}/api/events/?start_date=${startStr}&end_date=${endStr}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                
                const mappedEvents: CalendarEvent[] = data.map((ev: any) => {
                    const startDate = new Date(ev.date);
                    // Если end_date нет, ставим +1 час по дефолту
                    const endDate = ev.next_date ? new Date(ev.next_date) : new Date(startDate.getTime() + 60 * 60 * 1000);
                    
                    return {
                        id: ev.id,
                        title: ev.guest_name ? `👤 ${ev.guest_name}` : `🐾 ${ev.pet_info?.name || 'Питомец'} - ${ev.title}`,
                        start: startDate,
                        end: endDate,
                        resource: ev,
                        isGuest: !ev.pet,
                        status: ev.status
                    };
                });
                setEvents(mappedEvents);
            }
        } catch (error) {
            console.error("Failed to fetch events", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Загружаем события при смене даты или вида
        if (user) { // Проверка user нужна, чтобы не дергать API без токена
             fetchEvents(date, view);
        }
    }, [date, view, fetchEvents, user]);

    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = '#3b82f6'; // Blue
        let borderColor = '#2563eb';

        if (event.status === 'completed') {
            backgroundColor = '#9ca3af'; 
            borderColor = '#6b7280';
        } else if (event.isGuest) {
            backgroundColor = '#f97316'; // Orange
            borderColor = '#ea580c';
        } else if (event.resource?.event_type?.category === 'medical') {
            backgroundColor = '#ef4444'; // Red
            borderColor = '#dc2626';
        }

        return {
            style: {
                backgroundColor,
                borderColor,
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block',
                fontSize: '0.85em'
            }
        };
    };

    const handleSelectSlot = ({ start }: { start: Date }) => {
        setSelectedDate(start);
        setEditingEvent(null);
        setIsCreateModalOpen(true);
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        setEditingEvent(event.resource);
        setIsCreateModalOpen(true);
    };

    const handleSuccess = () => {
        fetchEvents(date, view);
    };

    const handleNavigate = (newDate: Date) => setDate(newDate);
    const handleViewChange = (newView: View) => setView(newView);

    // Словарик для перевода интерфейса (если культура ru)
    const messages = culture === 'ru' ? {
        next: "Вперед",
        previous: "Назад",
        today: "Сегодня",
        month: "Месяц",
        week: "Неделя",
        day: "День",
        agenda: "Список",
        noEventsInRange: "Нет событий",
        showMore: (total: number) => `+ еще ${total}`
    } : undefined; // Для en-GB дефолтные подписи ок

    return (
        <AuthGuard>
            <div className="min-h-screen bg-card pt-24 px-4 pb-10">
                    <div className="max-w-[1920px] mx-auto h-[80vh] flex flex-col">
                        
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                    {culture === 'ru' ? 'Календарь записи' : 'Appointments Calendar'}
                                    {loading && <Loader2 className="animate-spin text-muted-foreground" size={20} />}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {culture === 'ru' ? 'Планирование приемов и операций' : 'Schedule management'}
                                </p>
                            </div>

                            <button 
                                onClick={() => handleSelectSlot({ start: new Date() })}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-primary/20 active:scale-[0.96]"
                            >
                                <Plus size={20} />
                                {culture === 'ru' ? 'Новая запись' : 'New Appointment'}
                            </button>
                        </div>

                        <div className="flex-1 bg-card rounded-2xl shadow-xl border border-border p-6 relative overflow-hidden">
                            <Calendar
                                localizer={localizer}
                                events={events}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: '100%' }}
                                
                                // Динамическая культура (ru или en-GB)
                                culture={culture}
                                messages={messages}

                                date={date}
                                view={view}
                                onNavigate={handleNavigate}
                                onView={handleViewChange}

                                selectable
                                onSelectSlot={handleSelectSlot}
                                onSelectEvent={handleSelectEvent}
                                
                                eventPropGetter={eventStyleGetter}
                            />
                        </div>
                    </div>
                    
                    <CreateCalendarEventModal 
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        onSuccess={handleSuccess}
                        initialDate={selectedDate}
                        initialData={editingEvent}
                    />
            </div>
        </AuthGuard>
    );
}