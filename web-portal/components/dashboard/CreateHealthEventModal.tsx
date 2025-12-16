'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, Check, Trash2, Paperclip } from 'lucide-react';

// === Интерфейсы ===
interface HealthEventAttachment {
    id: number;
    file: string;
}

interface CreateHealthEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    petId: number;
    initialData?: any; // Если передано - режим редактирования
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const EVENT_TYPES = [
    { value: 'vaccine', label: 'Вакцинация' },
    { value: 'parasite', label: 'Обработка от паразитов' },
    { value: 'medical', label: 'Визит к врачу / Лечение' },
    { value: 'hygiene', label: 'Гигиена / Уход' },
    { value: 'measure', label: 'Замеры (Вес/Рост)' },
    { value: 'other', label: 'Другое' },
];

const STATUS_CHOICES = [
    { value: 'planned', label: 'Запланировано' },
    { value: 'confirmed', label: 'Подтверждено' },
    { value: 'completed', label: 'Завершено' },
    { value: 'cancelled', label: 'Отменено' },
];

export default function CreateHealthEventModal({ isOpen, onClose, onSuccess, petId, initialData }: CreateHealthEventModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Новые файлы (для загрузки)
    const [files, setFiles] = useState<File[]>([]);
    
    // Существующие файлы (для отображения и удаления при редактировании)
    const [existingAttachments, setExistingAttachments] = useState<HealthEventAttachment[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Функция для datetime-local input (YYYY-MM-DDTHH:mm)
    const getCurrentDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // Форматирование даты из API в формат инпута
    const formatApiDateToInput = (isoString?: string) => {
        if (!isoString) return '';
        // Если дата приходит как "2025-12-15 14:30:00" или ISO, приводим к "2025-12-15T14:30"
        return isoString.replace(' ', 'T').slice(0, 16);
    };

    const [formData, setFormData] = useState({
        event_type: 'medical',
        status: 'completed',
        title: '',
        date: getCurrentDateTime(), 
        next_date: '',
        description: ''
    });

    // === [LOGIC] Заполнение формы при открытии ===
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Режим редактирования
                setFormData({
                    event_type: initialData.event_type || 'medical',
                    status: initialData.status || 'completed',
                    title: initialData.title || '',
                    date: formatApiDateToInput(initialData.date) || getCurrentDateTime(),
                    next_date: formatApiDateToInput(initialData.next_date),
                    description: initialData.description || ''
                });
                setExistingAttachments(initialData.attachments || []);
            } else {
                // Режим создания (сброс)
                setFormData({
                    event_type: 'medical',
                    status: 'completed',
                    title: '',
                    date: getCurrentDateTime(), 
                    next_date: '',
                    description: ''
                });
                setExistingAttachments([]);
            }
            setFiles([]); // Всегда очищаем новые файлы при открытии
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            // Лимит 5 файлов (сумма старых и новых)
            const totalCount = existingAttachments.length + files.length + newFiles.length;
            if (totalCount > 5) {
                alert('Максимум 5 файлов');
                return;
            }
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeNewFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Удаление уже загруженного файла (через API)
    const removeExistingFile = async (attachmentId: number) => {
        if (!confirm('Удалить этот файл навсегда?')) return;
        
        try {
            const token = localStorage.getItem('access_token');
            const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId));
            } else {
                alert('Ошибка при удалении файла. Возможно, нет прав.');
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка сети');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const token = localStorage.getItem('access_token');
        const data = new FormData();

        // Если это создание - передаем petId. Если редактирование - он не нужен (но не помешает)
        if (!initialData) {
            data.append('pet', petId.toString());
        }
        
        data.append('event_type', formData.event_type);
        data.append('status', formData.status);
        data.append('title', formData.title);
        // Заменяем T на пробел для бэкенда (хотя DRF обычно понимает ISO)
        data.append('date', formData.date.replace('T', ' '));
        data.append('description', formData.description);

        if (formData.next_date) {
            data.append('next_date', formData.next_date.replace('T', ' '));
        } else {
            // Чтобы стереть дату напоминания при редактировании
            data.append('next_date', ''); 
        }

        // Добавляем новые файлы
        files.forEach((file) => {
            data.append('attachments', file);
        });

        try {
            // Определяем URL и метод (POST или PATCH)
            const url = initialData 
                ? `${API_URL}/api/health-events/${initialData.id}/` 
                : `${API_URL}/api/health-events/`;
            
            const method = initialData ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: data
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("Server Error:", errorData);
                throw new Error('Ошибка при сохранении');
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Не удалось сохранить запись. Проверьте данные.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditMode = !!initialData;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-blue-500" size={20} />
                        {isEditMode ? 'Редактирование записи' : 'Новая запись'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="health-form" onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Тип и Статус */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Тип события</label>
                                <select 
                                    value={formData.event_type}
                                    onChange={e => setFormData({...formData, event_type: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                                >
                                    {EVENT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Статус</label>
                                <select 
                                    value={formData.status}
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-200 outline-none"
                                >
                                    {STATUS_CHOICES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Название */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Название</label>
                            <input 
                                type="text" 
                                required
                                placeholder="Например: Вакцинация Нобивак"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                            />
                        </div>

                        {/* Даты (datetime-local) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Дата и Время</label>
                                <input 
                                    type="datetime-local" 
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase text-blue-600">Напоминание</label>
                                <input 
                                    type="datetime-local" 
                                    value={formData.next_date}
                                    onChange={e => setFormData({...formData, next_date: e.target.value})}
                                    className="w-full border border-blue-200 bg-blue-50/50 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                />
                            </div>
                        </div>

                        {/* Описание */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Описание</label>
                            <textarea 
                                rows={3}
                                placeholder="Заметки..."
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                            />
                        </div>

                        {/* Файлы */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Вложения (макс. 5)</label>
                            
                            {/* Отображение СУЩЕСТВУЮЩИХ файлов (только в режиме редактирования) */}
                            {existingAttachments.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {existingAttachments.map((att) => (
                                        <div key={att.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                                            <a href={att.file} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden hover:underline text-blue-700">
                                                <Paperclip size={14} className="flex-shrink-0" />
                                                <span className="truncate">Вложение #{att.id}</span>
                                            </a>
                                            <button 
                                                type="button"
                                                onClick={() => removeExistingFile(att.id)}
                                                className="text-red-400 hover:text-red-600 p-1 transition"
                                                title="Удалить файл"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Кнопка загрузки НОВЫХ файлов */}
                            {(files.length + existingAttachments.length) < 5 && (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition mb-3"
                                >
                                    <UploadCloud className="text-gray-400" size={20} />
                                    <span className="text-sm text-gray-600 font-medium">Добавить файл</span>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden" 
                                        multiple 
                                        accept="image/*,.pdf,.doc,.docx"
                                    />
                                </div>
                            )}

                            {/* Список НОВЫХ файлов (которые еще не улетели на сервер) */}
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    {files.map((f, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Paperclip size={14} className="text-gray-400 flex-shrink-0" />
                                                <span className="truncate text-gray-700">{f.name}</span>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => removeNewFile(idx)}
                                                className="text-red-400 hover:text-red-600 p-1 transition"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <button 
                        form="health-form"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? 'Сохранение...' : (
                            <>
                                <Check size={18} /> {isEditMode ? 'Обновить запись' : 'Сохранить'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}