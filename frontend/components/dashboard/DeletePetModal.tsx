'use client';

import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface DeletePetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    petName: string;
    isDeleting: boolean;
}

export default function DeletePetModal({ isOpen, onClose, onConfirm, petName, isDeleting }: DeletePetModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                onClick={!isDeleting ? onClose : undefined} 
            />
            
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header с иконкой предупреждения */}
                <div className="pt-6 px-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                        <AlertTriangle size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Удалить питомца?</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        Вы собираетесь удалить профиль <span className="font-bold text-gray-800">"{petName}"</span>. 
                    </p>
                </div>

                {/* Предупреждение */}
                <div className="px-6 py-4">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 leading-relaxed text-center font-medium">
                        Это действие нельзя отменить. Все данные: история болезней, фотографии и события будут удалены безвозвратно.
                    </div>
                </div>

                {/* Footer с кнопками */}
                <div className="p-4 bg-gray-50 flex gap-3">
                    <button 
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Trash2 size={18} /> Удалить
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}