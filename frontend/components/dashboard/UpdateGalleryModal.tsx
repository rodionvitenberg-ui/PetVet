'use client';

import React, { useState, useRef } from 'react';
import { X, Trash2, Plus, UploadCloud, ImageIcon, AlertCircle } from 'lucide-react';
import { addToast } from "@heroui/toast"; // <--- Импорт

interface UpdateGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    petId: number;
    images: { id: number; image: string; is_main: boolean }[];
    onSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getMediaUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
};

export default function UpdateGalleryModal({ isOpen, onClose, petId, images, onSuccess }: UpdateGalleryModalProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // 1. Загрузка фото
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setError(null);
        const token = localStorage.getItem('access_token');

        try {
            let uploadedCount = 0;
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('image', files[i]);
                
                const res = await fetch(`${API_URL}/api/pets/${petId}/upload_image/`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (res.status === 403) throw new Error('У вас нет прав на редактирование этого питомца');
                if (!res.ok) throw new Error('Ошибка загрузки. Проверьте формат файла.');
                uploadedCount++;
            }
            
            // [TOAST] Успех загрузки
            addToast({ 
                title: "Фото загружены", 
                description: `Добавлено изображений: ${uploadedCount}`, 
                color: "success", 
                variant: "flat" 
            });

            onSuccess();
        } catch (error: any) {
            console.error(error);
            setError(error.message || "Не удалось загрузить изображения");
            
            // [TOAST] Ошибка
            addToast({ 
                title: "Ошибка загрузки", 
                description: error.message, 
                color: "danger", 
                variant: "flat" 
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // 2. Инициация удаления
    const requestDelete = (imageId: number) => {
        setError(null);
        setDeletingId(imageId);
    };

    // 3. Подтверждение удаления
    const confirmDelete = async () => {
        if (!deletingId) return;

        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_URL}/api/pet_images/${deletingId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 403) throw new Error('Недостаточно прав.');
            if (res.ok) {
                // [TOAST] Успех удаления
                addToast({ 
                    title: "Фото удалено", 
                    color: "default", 
                    variant: "flat" 
                });

                setDeletingId(null);
                onSuccess();
            } else {
                throw new Error("Ошибка сервера при удалении.");
            }
        } catch (error: any) {
            console.error(error);
            setError(error.message || "Ошибка сети");
            setDeletingId(null);
            
            // [TOAST] Ошибка удаления
            addToast({ 
                title: "Не удалось удалить", 
                description: error.message, 
                color: "danger", 
                variant: "flat" 
            });
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                
                {/* Хедер */}
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <ImageIcon size={20} className="text-blue-500"/>
                        Галерея питомца
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Ошибки (оставляем и встроенный блок для наглядности) */}
                {error && (
                    <div className="bg-red-50 p-3 flex items-center gap-3 text-red-600 text-sm font-medium border-b border-red-100 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
                            <X size={14} />
                        </button>
                    </div>
                )}

                <div className="p-6 overflow-y-auto custom-scrollbar relative">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {/* Кнопка загрузки */}
                        <label className={`aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition group ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleFileUpload} 
                                ref={fileInputRef}
                            />
                            {isUploading ? (
                                <UploadCloud className="animate-bounce text-blue-500" size={32} />
                            ) : (
                                <Plus size={32} className="text-gray-400 group-hover:text-blue-500 transition" />
                            )}
                            <span className="text-xs text-gray-500 mt-2 font-medium">
                                {isUploading ? 'Загрузка...' : 'Добавить фото'}
                            </span>
                        </label>

                        {/* Список изображений */}
                        {images.map((img) => (
                            <div key={img.id} className="relative aspect-square group rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                <img 
                                    src={getMediaUrl(img.image)!} 
                                    alt="gallery" 
                                    className="w-full h-full object-cover transition duration-500 group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                
                                <button 
                                    onClick={() => requestDelete(img.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg shadow-md transition-all hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:transform sm:translate-y-2 sm:group-hover:translate-y-0"
                                    title="Удалить фото"
                                >
                                    <Trash2 size={16} />
                                </button>

                                {img.is_main && (
                                    <div className="absolute bottom-2 left-2 bg-blue-500/90 text-white text-[10px] px-2 py-0.5 rounded-md font-bold shadow-sm backdrop-blur-md">
                                        Главное
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Оверлей подтверждения */}
                    {deletingId && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-200 rounded-xl">
                            <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 max-w-sm w-full mx-4 text-center transform scale-100 animate-in zoom-in-95 duration-200">
                                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trash2 size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2">Удалить это фото?</h4>
                                <p className="text-sm text-gray-500 mb-6">Это действие нельзя будет отменить.</p>
                                <div className="flex gap-3 justify-center">
                                    <button 
                                        onClick={() => setDeletingId(null)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                                    >
                                        Отмена
                                    </button>
                                    <button 
                                        onClick={confirmDelete}
                                        className="px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition shadow-lg shadow-red-200"
                                    >
                                        Да, удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}