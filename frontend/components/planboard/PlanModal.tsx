'use client';

import React, { useState, useEffect } from 'react';
import { X, CalendarClock, Check } from 'lucide-react';

interface PlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
}

export default function PlanModal({ isOpen, onClose, onConfirm }: PlanModalProps) {
    const [dateValue, setDateValue] = useState('');
    // Состояние для активной кнопки (храним кол-во дней)
    const [activeButton, setActiveButton] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
            setDateValue(tomorrow.toISOString().slice(0, 16));
            // По умолчанию мы предлагаем "Завтра", поэтому подсвечиваем кнопку "1" (день)
            setActiveButton(1); 
        }
    }, [isOpen]);

    const handleQuickSet = (daysToAdd: number) => {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        date.setHours(9, 0, 0, 0);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        setDateValue(date.toISOString().slice(0, 16));
        setActiveButton(daysToAdd);
    };

    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateValue(e.target.value);
        setActiveButton(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(new Date(dateValue));
    };

    if (!isOpen) return null;

    // Стили
    const baseBtnClass = "px-4 py-3 border rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center";
    const inactiveClass = "bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600";
    const activeClass = "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 transform scale-105 ring-2 ring-blue-100 ring-offset-1";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <CalendarClock className="text-blue-500" size={20} />
                        Перенос в планы
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="text-sm text-gray-500 text-center leading-relaxed">
                         Вы откладываете задачу в <span className="font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">ПЛАНЫ</span><br/>
                         На какую дату?
                    </div>

                    <input 
                        type="datetime-local" 
                        required
                        value={dateValue}
                        onChange={handleManualChange}
                        className="w-full border border-gray-300 rounded-xl p-3 text-lg font-mono text-center outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
                    />

                    {/* Быстрые кнопки */}
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            type="button" 
                            onClick={() => handleQuickSet(1)} 
                            className={`${baseBtnClass} ${activeButton === 1 ? activeClass : inactiveClass}`}
                        >
                            Завтра
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleQuickSet(2)} 
                            className={`${baseBtnClass} ${activeButton === 2 ? activeClass : inactiveClass}`}
                        >
                            Послезавтра
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleQuickSet(7)} 
                            className={`${baseBtnClass} ${activeButton === 7 ? activeClass : inactiveClass}`}
                        >
                            Через неделю
                        </button>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-base"
                        >
                            <Check size={20} /> Перенести
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}