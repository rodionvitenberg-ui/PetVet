import React from 'react';
import { AlertTriangle, X, Loader2, Trash2 } from 'lucide-react';

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
}

export default function DeleteAccountModal({ isOpen, onClose, onConfirm, isLoading }: DeleteAccountModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Карточка модалки */}
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative scale-100 animate-in zoom-in-95 duration-200">
                
                {/* Кнопка закрытия (крестик) */}
                <button 
                    onClick={onClose} 
                    disabled={isLoading}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                >
                    <X size={24} />
                </button>

                <div className="flex flex-col items-center text-center">
                    {/* Иконка */}
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-5">
                        <AlertTriangle size={32} />
                    </div>
                    
                    {/* Заголовок */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Удалить аккаунт?</h3>
                    
                    {/* Текст предупреждения */}
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                        Это действие <b>необратимо</b>. Все ваши данные, профили питомцев и история болезней будут удалены без возможности восстановления.
                    </p>

                    {/* Кнопки */}
                    <div className="flex flex-col gap-3 w-full">
                        <button 
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg shadow-red-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                            Да, удалить навсегда
                        </button>
                        
                        <button 
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                        >
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}