'use client';

import React from 'react';
import { X, CreditCard, CheckCircle2 } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    invoiceId: number | null;
    amount: string;
    isSubmitting: boolean;
}

export default function PaymentModal({ isOpen, onClose, onConfirm, invoiceId, amount, isSubmitting }: PaymentModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <CreditCard size={32} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Подтверждение оплаты
                    </h3>
                    
                    <p className="text-gray-500 text-sm mb-6">
                        Вы хотите отметить счет <span className="font-bold text-gray-800">#{invoiceId}</span> на сумму <span className="font-bold text-gray-800">{amount} €</span> как оплаченный?
                        <br/><br/>
                        Это действие обновит финансовую статистику клиники.
                    </p>

                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                        >
                            Отмена
                        </button>
                        <button 
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'Обработка...' : (
                                <>
                                    <CheckCircle2 size={18} />
                                    Оплачено
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}