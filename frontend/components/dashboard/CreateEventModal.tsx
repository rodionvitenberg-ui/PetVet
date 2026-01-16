'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, Check, Trash2, Paperclip, ChevronDown, Activity, Heart, Trophy, Sparkles, HelpCircle } from 'lucide-react';
import { EventType, EventCategory } from '@/types/event';

// === Интерфейсы ===
interface Attachment {
    id: number;
    file: string;
}

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    petId: number;
    initialData?: any; // Если передано - режим редактирования
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const STATUS_CHOICES = [
    { value: 'planned', label: 'Запланировано', color: 'bg-blue-100 text-blue-700' },
    { value: 'completed', label: 'Завершено', color: 'bg-green-100 text-green-700' },
    { value: 'missed', label: 'Пропущено', color: 'bg-red-100 text-red-700' },
];

// Маппинг иконок категорий для UI
const CATEGORY_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
    medical: { label: 'Медицина', icon: Activity, color: 'text-red-500 bg-red-50' },
    reproduction: { label: 'Репродукция', icon: Heart, color: 'text-pink-500 bg-pink-50' },
    show: { label: 'Выставки и Документы', icon: Trophy, color: 'text-amber-500 bg-amber-50' },
    care: { label: 'Уход и Груминг', icon: Sparkles, color: 'text-purple-500 bg-purple-50' },
    other: { label: 'Другое', icon: HelpCircle, color: 'text-gray-500 bg-gray-50' },
};

export default function CreateEventModal({ isOpen, onClose, onSuccess, petId, initialData }: CreateEventModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTypes, setIsLoadingTypes] = useState(false);
    
    // Справочник типов событий, загруженный с бэка
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    
    // Файлы
    const [files, setFiles] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        status: 'completed',
        title: '',
        date: '',
        next_date: '',
        description: ''
    });

    // Хелперы дат
    const getCurrentDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };
    
    const formatApiDateToInput = (isoString?: string) => {
        if (!isoString) return '';
        return isoString.replace(' ', 'T').slice(0, 16);
    };

    // === 1. ЗАГРУЗКА ТИПОВ СОБЫТИЙ ===
    useEffect(() => {
        if (isOpen) {
            setIsLoadingTypes(true);
            const token = localStorage.getItem('access_token');
            fetch(`${API_URL}/api/event-types/`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })
            .then(res => res.json())
            .then((data: EventType[]) => {
                setEventTypes(data);
                // Если создаем новое событие - выберем дефолтное (например, первое попавшееся или 'other')
                if (!initialData && data.length > 0 && !selectedTypeId) {
                     // Можно ничего не выбирать, заставляя юзера кликнуть
                }
            })
            .catch(err => console.error("Failed to load event types", err))
            .finally(() => setIsLoadingTypes(false));
        }
    }, [isOpen]);

    // === 2. ЗАПОЛНЕНИЕ ДАННЫХ ===
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Edit Mode
                setFormData({
                    status: initialData.status || 'completed',
                    title: initialData.title || '',
                    date: formatApiDateToInput(initialData.date) || getCurrentDateTime(),
                    next_date: formatApiDateToInput(initialData.next_date),
                    description: initialData.description || ''
                });
                setSelectedTypeId(initialData.event_type?.id || initialData.event_type_id || null);
                setExistingAttachments(initialData.attachments || []);
            } else {
                // Create Mode
                setFormData({
                    status: 'completed',
                    title: '',
                    date: getCurrentDateTime(), 
                    next_date: '',
                    description: ''
                });
                setSelectedTypeId(null);
                setExistingAttachments([]);
            }
            setFiles([]); 
        }
    }, [isOpen, initialData]);

    // Авто-заголовок при выборе типа (если заголовок пустой)
    const handleTypeSelect = (type: EventType) => {
        setSelectedTypeId(type.id);
        if (!formData.title) {
            setFormData(prev => ({ ...prev, title: type.name }));
        }
    };

    // Группировка типов по категориям для рендера
    const groupedTypes = eventTypes.reduce((acc, type) => {
        const cat = type.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(type);
        return acc;
    }, {} as Record<string, EventType[]>);


    // === FILE HANDLERS ===
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (existingAttachments.length + files.length + newFiles.length > 5) {
                alert('Максимум 5 файлов');
                return;
            }
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeNewFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingFile = async (attachmentId: number) => {
        if (!confirm('Удалить файл навсегда?')) return;
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
        } catch (e) { console.error(e); }
    };

    // === SUBMIT ===
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTypeId) {
            alert("Выберите тип события");
            return;
        }
        setIsSubmitting(true);

        const token = localStorage.getItem('access_token');
        const data = new FormData();

        if (!initialData) data.append('pet', petId.toString());
        
        // [IMPORTANT] Отправляем ID типа, а не строку
        data.append('event_type_id', selectedTypeId.toString()); 
        
        data.append('status', formData.status);
        data.append('title', formData.title);
        data.append('date', formData.date.replace('T', ' ')); // Backend compat
        data.append('description', formData.description);

        if (formData.next_date) data.append('next_date', formData.next_date.replace('T', ' '));
        else data.append('next_date', ''); 

        files.forEach((file) => data.append('attachments', file));

        try {
            // Внимание: Endpoint может отличаться. Проверьте views.py.
            // Судя по предыдущим файлам, это PetEventViewSet. 
            // Обычно роутер DRF дает: /api/events/ или /api/pet-events/
            // Если CreateHealthEventModal использовал /api/health-events/, значит роутер был так настроен.
            // Предположим, вы обновили роутер на 'events' или 'pet-events'.
            // Используем 'pet-events' как более логичный, или вернем 'health-events' если вы не меняли urls.py
            // Давайте использовать `/api/events/` как наиболее вероятный новый путь.
            
            const endpoint = 'api/events'; // <-- ПРОВЕРИТЬ В urls.py
            
            const url = initialData 
                ? `${API_URL}/${endpoint}/${initialData.id}/` 
                : `${API_URL}/${endpoint}/`;
            
            const method = initialData ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
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
            alert("Не удалось сохранить. Проверьте данные.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-500" size={20} />
                        {initialData ? 'Редактирование' : 'Новое событие'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500"><X size={20} /></button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* 1. ВЫБОР ТИПА (СГРУППИРОВАННЫЙ) */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Что произошло?</label>
                            
                            {isLoadingTypes ? (
                                <div className="text-sm text-gray-400">Загрузка типов...</div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 max-h-48 overflow-y-auto custom-scrollbar border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                                    {Object.entries(groupedTypes).map(([catKey, types]) => {
                                        const catConfig = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.other;
                                        const CatIcon = catConfig.icon;

                                        return (
                                            <div key={catKey}>
                                                <div className="flex items-center gap-2 px-2 mb-2 mt-1">
                                                    <CatIcon size={14} className={catConfig.color.split(' ')[0]} />
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">{catConfig.label}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {types.map(type => (
                                                        <button
                                                            key={type.id}
                                                            type="button"
                                                            onClick={() => handleTypeSelect(type)}
                                                            className={`text-left px-3 py-2 rounded-lg text-sm border transition-all flex items-center gap-2 ${
                                                                selectedTypeId === type.id 
                                                                ? 'border-blue-500 bg-white ring-2 ring-blue-100 text-blue-700 font-bold shadow-sm' 
                                                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            {/* Иконка типа (если есть на бэке) или дефолтная */}
                                                            {type.icon ? (
                                                                <img src={type.icon} className="w-4 h-4 object-contain opacity-70" />
                                                            ) : (
                                                                <div className={`w-1.5 h-1.5 rounded-full ${catConfig.color.replace('text-', 'bg-')}`} />
                                                            )}
                                                            <span className="truncate">{type.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 2. ОСНОВНЫЕ ПОЛЯ */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Заголовок</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Например: Плановая прививка"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Дата</label>
                                    <input 
                                        type="datetime-local" 
                                        required
                                        value={formData.date}
                                        onChange={e => setFormData({...formData, date: e.target.value})}
                                        className="w-full border border-gray-300 rounded-xl p-2.5 text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Статус</label>
                                    <select 
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                        className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white outline-none"
                                    >
                                        {STATUS_CHOICES.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Напоминание */}
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                <label className="block text-xs font-bold text-blue-600 mb-1 uppercase">Напомнить о повторе</label>
                                <input 
                                    type="datetime-local" 
                                    value={formData.next_date}
                                    onChange={e => setFormData({...formData, next_date: e.target.value})}
                                    className="w-full border border-blue-200 bg-white rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                        </div>

                        {/* 3. ОПИСАНИЕ */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Описание</label>
                            <textarea 
                                rows={3}
                                placeholder="Дополнительные детали, вес, врач, клиника..."
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                            />
                        </div>

                        {/* 4. ФАЙЛЫ */}
                        <div>
                             {/* ... Код файлов остается практически тем же, скопирую для полноты ... */}
                             <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Вложения</label>
                             
                             {existingAttachments.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {existingAttachments.map((att) => (
                                        <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                            <span className="flex items-center gap-2 truncate text-blue-600">
                                                <Paperclip size={14}/> Вложение #{att.id}
                                            </span>
                                            <button type="button" onClick={() => removeExistingFile(att.id)} className="text-red-400 p-1"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(files.length + existingAttachments.length) < 5 && (
                                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition">
                                    <UploadCloud className="text-gray-400" size={20} />
                                    <span className="text-sm text-gray-600">Добавить файл</span>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                                </div>
                            )}
                            
                            {files.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {files.map((f, i) => (
                                        <div key={i} className="text-xs text-gray-500 flex justify-between">{f.name} <button onClick={() => removeNewFile(i)} className="text-red-500">x</button></div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <button 
                        form="event-form"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? 'Сохранение...' : <><Check size={18} /> Сохранить</>}
                    </button>
                </div>
            </div>
        </div>
    );
}