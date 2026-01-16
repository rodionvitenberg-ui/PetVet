'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
    ChevronLeft, Save, Activity, Paperclip, X, 
    UploadCloud, Heart, Trophy, Sparkles, HelpCircle
} from 'lucide-react';

// Импортируем типы (убедитесь, что путь верный)
import { EventType } from '@/types/event'; 

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const STATUS_CHOICES = [
    { value: 'planned', label: 'Запланировано', color: 'bg-blue-100 text-blue-700' },
    { value: 'completed', label: 'Завершено', color: 'bg-green-100 text-green-700' },
    { value: 'missed', label: 'Пропущено', color: 'bg-red-100 text-red-700' },
];

// Конфигурация категорий
const CATEGORY_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
    medical: { label: 'Медицина', icon: Activity, color: 'text-red-500 bg-red-50' },
    reproduction: { label: 'Репродукция', icon: Heart, color: 'text-pink-500 bg-pink-50' },
    show: { label: 'Выставки и Документы', icon: Trophy, color: 'text-amber-500 bg-amber-50' },
    care: { label: 'Уход и Груминг', icon: Sparkles, color: 'text-purple-500 bg-purple-50' },
    other: { label: 'Другое', icon: HelpCircle, color: 'text-gray-500 bg-gray-50' },
};

export default function CreateEventPage() {
    const router = useRouter();
    const params = useParams();
    // Приводим к строке на случай, если params вернет массив
    const petId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTypes, setIsLoadingTypes] = useState(true);
    const [petName, setPetName] = useState('');

    // Справочник типов
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

    // Данные формы
    const [formData, setFormData] = useState({
        status: 'completed',
        title: '',
        description: '',
        date: '',
        next_date: '',
    });

    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Хелпер даты
    const getCurrentDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // 1. Инициализация (Имя питомца + Типы событий)
    useEffect(() => {
        if (!petId) return;
        
        const token = localStorage.getItem('access_token');
        
        // [FIX] Явная типизация заголовков, чтобы TS не ругался
        const headers: Record<string, string> = token 
            ? { 'Authorization': `Bearer ${token}` } 
            : {};

        // Получаем имя питомца
        fetch(`${API_URL}/api/pets/${petId}/`, { headers })
            .then(res => {
                if (!res.ok) throw new Error('Pet not found');
                return res.json();
            })
            .then(data => setPetName(data.name))
            .catch(console.error);

        // Получаем типы событий
        setIsLoadingTypes(true);
        fetch(`${API_URL}/api/event-types/`, { headers })
            .then(res => res.json())
            .then((data: EventType[]) => {
                setEventTypes(data);
            })
            .catch(err => console.error("Failed to load event types", err))
            .finally(() => setIsLoadingTypes(false));

        // Устанавливаем дату по умолчанию
        setFormData(prev => ({ ...prev, date: getCurrentDateTime() }));
    }, [petId]);

    // Группировка типов по категориям
    const groupedTypes = eventTypes.reduce((acc, type) => {
        const cat = type.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(type);
        return acc;
    }, {} as Record<string, EventType[]>);

    // Обработка выбора типа
    const handleTypeSelect = (type: EventType) => {
        setSelectedTypeId(type.id);
        // Если заголовок пустой, подставляем название типа
        if (!formData.title) {
            setFormData(prev => ({ ...prev, title: type.name }));
        }
    };

    // Файлы
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (files.length + newFiles.length > 5) {
                alert('Максимум 5 файлов');
                return;
            }
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // 3. Отправка формы
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedTypeId) {
            alert("Пожалуйста, выберите тип события");
            return;
        }

        setIsLoading(true);
        const token = localStorage.getItem('access_token');

        try {
            const data = new FormData();
            data.append('pet', petId as string);
            data.append('event_type_id', selectedTypeId.toString()); 
            data.append('title', formData.title);
            data.append('description', formData.description);
            
            // Форматируем дату (YYYY-MM-DD HH:MM)
            data.append('date', formData.date.replace('T', ' ')); 
            data.append('status', formData.status);

            if (formData.next_date) {
                data.append('next_date', formData.next_date.replace('T', ' '));
            } else {
                data.append('next_date', '');
            }

            // Добавляем файлы
            files.forEach(file => {
                data.append('attachments', file); 
            });

            const res = await fetch(`${API_URL}/api/events/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Content-Type не нужен для FormData
                },
                body: data
            });

            if (!res.ok) {
                const err = await res.json();
                console.error(err);
                throw new Error('Ошибка сохранения');
            }

            // УСПЕХ: Возвращаемся
            router.push(`/pets/${petId}?tab=medical`);

        } catch (error) {
            console.error(error);
            alert('Не удалось создать запись. Проверьте данные.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-10 px-4">
            <div className="max-w-2xl mx-auto">
                
                {/* ХЕДЕР */}
                <div className="flex items-center gap-4 mb-6">
                    <button 
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white rounded-full transition text-gray-500"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Новая запись</h1>
                        <p className="text-sm text-gray-500">
                            {petName ? `Для питомца ${petName}` : 'Заполнение медкарты'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    
                    {/* ТИП СОБЫТИЯ (ГРУППИРОВАННЫЙ СПИСОК) */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Что произошло?</label>
                        
                        {isLoadingTypes ? (
                            <div className="text-sm text-gray-400 py-4 text-center">Загрузка списка событий...</div>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                {Object.entries(groupedTypes).map(([catKey, types]) => {
                                    const catConfig = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.other;
                                    const CatIcon = catConfig.icon;

                                    return (
                                        <div key={catKey} className="bg-gray-50/50 rounded-xl p-3 border border-gray-100">
                                            <div className="flex items-center gap-2 mb-2 px-1">
                                                <CatIcon size={16} className={catConfig.color.split(' ')[0]} />
                                                <span className="text-xs uppercase font-bold text-gray-500">{catConfig.label}</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {types.map(type => (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => handleTypeSelect(type)}
                                                        className={`text-left px-3 py-2.5 rounded-lg text-sm border transition-all flex items-center gap-2 ${
                                                            selectedTypeId === type.id 
                                                            ? 'border-blue-500 bg-white ring-2 ring-blue-100 text-blue-700 font-bold shadow-sm' 
                                                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm'
                                                        }`}
                                                    >
                                                        {type.icon ? (
                                                            <img src={type.icon} className="w-5 h-5 object-contain opacity-80" alt="" />
                                                        ) : (
                                                            <div className={`w-2 h-2 rounded-full shrink-0 ${catConfig.color.replace('text-', 'bg-')}`} />
                                                        )}
                                                        <span className="truncate leading-tight">{type.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100 my-4" />

                    {/* ОСНОВНЫЕ ПОЛЯ */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Заголовок</label>
                            <input 
                                type="text"
                                required
                                placeholder="Например: Плановая прививка"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition font-medium"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Дата события</label>
                                <input 
                                    type="datetime-local"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Статус</label>
                                <select 
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                                >
                                    {STATUS_CHOICES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Напоминание */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <label className="block text-xs font-bold text-blue-600 mb-2 uppercase flex items-center gap-2">
                                <Activity size={14} /> Напомнить о повторе
                            </label>
                            <input 
                                type="datetime-local" 
                                value={formData.next_date}
                                onChange={e => setFormData({...formData, next_date: e.target.value})}
                                className="w-full border border-blue-200 bg-white rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                            />
                        </div>
                    </div>

                    {/* ОПИСАНИЕ */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Описание / Заметки</label>
                        <textarea 
                            rows={4}
                            placeholder="Опишите симптомы, диагноз, вес, лекарства..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition resize-none"
                        />
                    </div>

                    {/* ФАЙЛЫ */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Вложения</label>
                        
                        {(files.length) < 5 && (
                            <div 
                                onClick={() => fileInputRef.current?.click()} 
                                className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition group"
                            >
                                <div className="p-3 bg-gray-100 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                                    <UploadCloud size={24} className="text-gray-400 group-hover:text-blue-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Нажмите, чтобы загрузить файлы</span>
                                <span className="text-xs text-gray-400">PDF, JPG, PNG (макс. 5)</span>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                            </div>
                        )}
                        
                        {files.length > 0 && (
                            <div className="space-y-2 mt-4">
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 text-gray-700 rounded-xl text-sm border border-gray-100">
                                        <div className="flex items-center gap-2 truncate">
                                            <Paperclip size={16} className="text-blue-500" />
                                            <span className="truncate max-w-[200px]">{file.name}</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => removeFile(idx)}
                                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* КНОПКА ОТПРАВКИ */}
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Activity className="animate-spin" />
                        ) : (
                            <>
                                <Save size={20} /> Сохранить запись
                            </>
                        )}
                    </button>

                </form>
            </div>
        </div>
    );
}