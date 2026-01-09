'use client';

import React, { useState, useRef } from 'react';
import { X, Trash2, Plus, UploadCloud, ImageIcon } from 'lucide-react';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // 1. Загрузка нового фото
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const token = localStorage.getItem('access_token');

        try {
            // Загружаем файлы по одному
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('image', files[i]);
                // Первое фото можно сделать главным, если галерея была пуста, но это логика бэка
                
                const res = await fetch(`${API_URL}/api/pets/${petId}/upload_image/`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!res.ok) throw new Error('Ошибка загрузки');
            }
            onSuccess(); // Обновляем данные в родительском компоненте
        } catch (error) {
            console.error(error);
            alert("Не удалось загрузить некоторые изображения");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // 2. Удаление фото
    const handleDelete = async (imageId: number) => {
        if (!confirm("Удалить это фото?")) return;

        const token = localStorage.getItem('access_token');
        try {
            // Предполагаем стандартный REST путь для удаления объекта модели PetImage
            // Если в urls.py нет роутера для images, нужно добавить
            const res = await fetch(`${API_URL}/api/pet_images/${imageId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                onSuccess();
            } else {
                alert("Ошибка удаления. Убедитесь, что у вас есть права.");
            }
        } catch (error) {
            console.error(error);
            alert("Ошибка сети");
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <ImageIcon size={20} className="text-blue-500"/>
                        Галерея питомца
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    
                    {/* Сетка фото */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {/* Кнопка добавления */}
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

                        {/* Список фото */}
                        {images.map((img) => (
                            <div key={img.id} className="relative aspect-square group rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                <img 
                                    src={getMediaUrl(img.image)!} 
                                    alt="gallery" 
                                    className="w-full h-full object-cover transition duration-500 group-hover:scale-110" 
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                
                                <button 
                                    onClick={() => handleDelete(img.id)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-md transform translate-y-2 group-hover:translate-y-0"
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
                </div>
            </div>
        </div>
    );
}