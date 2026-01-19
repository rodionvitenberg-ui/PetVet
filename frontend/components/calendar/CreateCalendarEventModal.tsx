'use client';

import React, { useState, useEffect } from 'react';
import { X, CalendarClock, User, Phone, Check, Activity, Heart, Trophy, Sparkles, HelpCircle, AlertCircle } from 'lucide-react';
import { EventType } from '@/types/event';

interface CreateCalendarEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialDate?: Date; // Дата, на которую кликнули в календаре
    initialData?: any;  // Если редактируем
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Конфиг иконок (тот же, для консистентности)
const CATEGORY_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
    medical: { label: 'Медицина', icon: Activity, color: 'text-red-500 bg-red-50' },
    reproduction: { label: 'Репродукция', icon: Heart, color: 'text-pink-500 bg-pink-50' },
    show: { label: 'Документы', icon: Trophy, color: 'text-amber-500 bg-amber-50' },
    care: { label: 'Груминг', icon: Sparkles, color: 'text-purple-500 bg-purple-50' },
    other: { label: 'Другое', icon: HelpCircle, color: 'text-gray-500 bg-gray-50' },
};

export default function CreateCalendarEventModal({ isOpen, onClose, onSuccess, initialDate, initialData }: CreateCalendarEventModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTypes, setIsLoadingTypes] = useState(false);
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);

    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        description: '',
        guest_name: '',
        guest_phone: '',
        status: 'planned' // Для календаря дефолт - запланировано
    });

    // Хелпер: Date Object -> "YYYY-MM-DDTHH:mm"
    const formatDateForInput = (date: Date) => {
        const offset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    // Хелпер: API String -> "YYYY-MM-DDTHH:mm"
    const formatApiDateToInput = (isoString?: string) => {
        if (!isoString) return '';
        return isoString.replace(' ', 'T').slice(0, 16);
    };

    // 1. ЗАГРУЗКА ТИПОВ
    useEffect(() => {
        if (isOpen) {
            setIsLoadingTypes(true);
            const token = localStorage.getItem('access_token');
            fetch(`${API_URL}/api/event-types/`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.json())
                .then(data => setEventTypes(data))
                .catch(console.error)
                .finally(() => setIsLoadingTypes(false));
        }
    }, [isOpen]);

    // 2. ИНИЦИАЛИЗАЦИЯ ПОЛЕЙ
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Редактирование
                setFormData({
                    title: initialData.title || '',
                    date: formatApiDateToInput(initialData.date),
                    description: initialData.description || '',
                    guest_name: initialData.guest_name || '',
                    guest_phone: initialData.guest_phone || '',
                    status: initialData.status || 'planned'
                });
                setSelectedTypeId(initialData.event_type?.id || initialData.event_type_id || null);
            } else {
                // Создание (с нуля или по клику на слот)
                setFormData({
                    title: '',
                    date: initialDate ? formatDateForInput(initialDate) : formatDateForInput(new Date()),
                    description: '',
                    guest_name: '',
                    guest_phone: '',
                    status: 'planned'
                });
                setSelectedTypeId(null);
            }
        }
    }, [isOpen, initialDate, initialData]);

    const handleTypeSelect = (type: EventType) => {
        setSelectedTypeId(type.id);
        // Если заголовка нет, подставляем название типа
        if (!formData.title) setFormData(prev => ({ ...prev, title: type.name }));
    };

    // Группировка
    const groupedTypes = eventTypes.reduce((acc, type) => {
        const cat = type.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(type);
        return acc;
    }, {} as Record<string, EventType[]>);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTypeId) return alert("Выберите тип события");

        setIsSubmitting(true);
        const token = localStorage.getItem('access_token');

        // Используем JSON вместо FormData, так как файлов нет и структура простая
        const payload: any = {
            event_type_id: selectedTypeId,
            title: formData.title,
            date: formData.date.replace('T', ' '),
            description: formData.description,
            status: formData.status,
            // Важно: если это гость, шлем данные гостя, pet шлем null
            guest_name: formData.guest_name || null,
            guest_phone: formData.guest_phone || null,
            pet: initialData?.pet || null // Сохраняем питомца при редактировании, иначе null
        };

        try {
            const url = initialData 
                ? `${API_URL}/api/events/${initialData.id}/` 
                : `${API_URL}/api/events/`;
            
            const method = initialData ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                console.error(err);
                throw new Error('Ошибка сохранения');
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Ошибка сохранения. Проверьте обязательные поля.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
                
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <CalendarClock className="text-blue-600" size={20} />
                        {initialData ? 'Редактирование записи' : 'Новая запись'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <form id="calendar-form" onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* 1. КЛИЕНТ (ГОСТЬ) */}
                        {/* Показываем поля гостя, только если это не редактирование существующего питомца */}
                        {(!initialData?.pet) && (
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-3">
                                <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase mb-1">
                                    <User size={14} /> Клиент (Гость)
                                </div>
                                
                                <input 
                                    type="text" 
                                    required={!initialData} // Обязательно при создании
                                    placeholder="Имя клиента"
                                    value={formData.guest_name}
                                    onChange={e => setFormData({...formData, guest_name: e.target.value})}
                                    className="w-full border border-orange-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                                />
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                                    <input 
                                        type="tel" 
                                        placeholder="Телефон"
                                        value={formData.guest_phone}
                                        onChange={e => setFormData({...formData, guest_phone: e.target.value})}
                                        className="w-full border border-orange-200 rounded-lg pl-9 p-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Если редактируем событие ПИТОМЦА - покажем инфо-блок */}
                        {initialData?.pet && (
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-800 text-sm flex items-center gap-2">
                                <span className="font-bold">Пациент:</span> {initialData.pet_info?.name || 'Питомец'}
                            </div>
                        )}

                        {/* 2. ТИП СОБЫТИЯ */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Тип приема</label>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar border border-gray-100 rounded-xl p-2">
                                {Object.entries(groupedTypes).map(([catKey, types]) => {
                                    const catConfig = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.other;
                                    return (
                                        <div key={catKey}>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase px-2 mt-1 mb-1">{catConfig.label}</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {types.map(type => (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => handleTypeSelect(type)}
                                                        className={`text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all truncate ${
                                                            selectedTypeId === type.id 
                                                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                                            : 'border-gray-100 bg-white text-gray-600 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        {type.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* 3. ДЕТАЛИ */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Время</label>
                                <input 
                                    type="datetime-local" 
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-3 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Заголовок / Причина</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Краткое описание"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Комментарий</label>
                                <textarea 
                                    rows={2}
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50">
                    <button 
                        form="calendar-form"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <span className="animate-pulse">Сохранение...</span> : <><Check size={18} /> Записать</>}
                    </button>
                </div>
            </div>
        </div>
    );
}