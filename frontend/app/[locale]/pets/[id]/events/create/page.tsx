'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
    ChevronLeft, Save, Calendar, FileText, 
    Stethoscope, Activity, Paperclip, X 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Типы событий (можно вынести в отдельный конфиг)
const EVENT_TYPES = [
    { value: 'examination', label: 'Осмотр', icon: Stethoscope },
    { value: 'vaccination', label: 'Вакцинация', icon: Activity },
    { value: 'surgery', label: 'Операция', icon: Activity },
    { value: 'analysis', label: 'Анализы', icon: FileText },
    { value: 'treatment', label: 'Процедуры', icon: Activity },
    { value: 'other', label: 'Другое', icon: FileText },
];

export default function CreateEventPage() {
    const router = useRouter();
    const params = useParams();
    const petId = params?.id;

    const [isLoading, setIsLoading] = useState(false);
    const [petName, setPetName] = useState('');

    // Данные формы
    const [formData, setFormData] = useState({
        event_type: 'examination',
        title: '',
        description: '',
        date: new Date().toISOString().slice(0, 16), // Текущая дата и время для input type="datetime-local"
        status: 'completed' // По умолчанию выполненное событие
    });

    const [files, setFiles] = useState<File[]>([]);

    // 1. Получаем имя питомца (для красивого заголовка)
    useEffect(() => {
        if (!petId) return;
        const token = localStorage.getItem('access_token');
        fetch(`${API_URL}/api/pets/${petId}/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setPetName(data.name))
        .catch(console.error);
    }, [petId]);

    // 2. Обработка файлов
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // 3. Отправка формы
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const token = localStorage.getItem('access_token');

        try {
            // Используем FormData для отправки файлов
            const data = new FormData();
            data.append('pet', petId as string);
            data.append('event_type', formData.event_type);
            data.append('title', formData.title || EVENT_TYPES.find(t => t.value === formData.event_type)?.label || 'Событие');
            data.append('description', formData.description);
            data.append('date', formData.date);
            data.append('status', formData.status);

            // Добавляем файлы
            files.forEach(file => {
                data.append('uploaded_files', file); 
            });

            const res = await fetch(`${API_URL}/api/health-events/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Content-Type не ставим вручную при FormData, браузер сам поставит boundary
                },
                body: data
            });

            if (!res.ok) throw new Error('Ошибка сохранения');

            // УСПЕХ: Возвращаемся на страницу питомца во вкладку Medical
            router.push(`/pets/${petId}?tab=medical`);

        } catch (error) {
            console.error(error);
            alert('Не удалось создать запись');
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
                    
                    {/* ТИП СОБЫТИЯ */}
                    <div className="grid grid-cols-3 gap-3">
                        {EVENT_TYPES.map(type => {
                            const Icon = type.icon;
                            const isSelected = formData.event_type === type.value;
                            return (
                                <div 
                                    key={type.value}
                                    onClick={() => setFormData({ ...formData, event_type: type.value })}
                                    className={`cursor-pointer rounded-xl p-3 flex flex-col items-center justify-center gap-2 border transition-all ${
                                        isSelected 
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                        : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon size={20} />
                                    <span className="text-xs font-bold">{type.label}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* ДАТА И ВРЕМЯ */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Дата и время</label>
                        <input 
                            type="datetime-local"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                        />
                    </div>

                    {/* ЗАГОЛОВОК (Опционально) */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Название (необязательно)</label>
                        <input 
                            type="text"
                            placeholder="Например: Вторая прививка Мультикан"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                        />
                    </div>

                    {/* ОПИСАНИЕ / ЗАКЛЮЧЕНИЕ */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Заключение / Описание</label>
                        <textarea 
                            rows={6}
                            placeholder="Опишите симптомы, диагноз и назначения..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition resize-none"
                        />
                    </div>

                    {/* ФАЙЛЫ */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Прикрепить файлы</label>
                        <div className="flex items-center gap-3 mb-3">
                            <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                                <Paperclip size={16} />
                                Выбрать файлы
                                <input type="file" multiple className="hidden" onChange={handleFileChange} />
                            </label>
                            <span className="text-xs text-gray-400">PDF, JPG, PNG</span>
                        </div>
                        
                        {files.length > 0 && (
                            <div className="space-y-2">
                                {files.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                                        <span className="truncate max-w-[80%]">{file.name}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => removeFile(idx)}
                                            className="p-1 hover:bg-blue-100 rounded-full"
                                        >
                                            <X size={14} />
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