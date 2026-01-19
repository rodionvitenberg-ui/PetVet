'use client';

import React, { useState, useEffect } from 'react';
import { X, CalendarClock, Check } from 'lucide-react';

interface TimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
}

export default function TimeModal({ isOpen, onClose, onConfirm }: TimeModalProps) {
    const [dateValue, setDateValue] = useState('');
    // Состояние для активной кнопки (храним число часов или 'morning')
    const [activeButton, setActiveButton] = useState<string | number | null>(null);

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setDateValue(now.toISOString().slice(0, 16));
            setActiveButton(null); // При открытии ничего не выбрано (стоит "Сейчас")
        }
    }, [isOpen]);

    const handleQuickSet = (hoursToAdd: number) => {
        const date = new Date();
        date.setHours(date.getHours() + hoursToAdd);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        setDateValue(date.toISOString().slice(0, 16));
        setActiveButton(hoursToAdd); // Подсвечиваем нажатую кнопку
    };

    const handleMorningSet = () => {
        const date = new Date();
        date.setDate(date.getDate() + 1); // Завтра
        date.setHours(9, 0, 0, 0); // 09:00
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        setDateValue(date.toISOString().slice(0, 16));
        setActiveButton('morning');
    };

    // Если юзер меняет руками - сбрасываем подсветку кнопок
    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateValue(e.target.value);
        setActiveButton(null); 
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(new Date(dateValue));
    };

    if (!isOpen) return null;

    // Базовые стили кнопок
    const baseBtnClass = "px-4 py-3 border rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center";
    
    // Стили состояний
    const inactiveClass = "bg-white border-gray-200 text-gray-600 hover:border-red-400 hover:bg-red-50 hover:text-red-600";
    const activeClass = "bg-red-600 border-red-600 text-white shadow-md shadow-red-200 transform scale-105 ring-2 ring-red-100 ring-offset-1";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <CalendarClock className="text-red-500" size={20} />
                        Укажите время
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="text-sm text-gray-500 text-center leading-relaxed">
                        Вы переносите задачу в <span className="font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">СРОЧНО</span><br/>
                        Когда её нужно выполнить?
                    </div>

                    <input 
                        type="datetime-local" 
                        required
                        value={dateValue}
                        onChange={handleManualChange}
                        className="w-full border border-gray-300 rounded-xl p-3 text-lg font-mono text-center outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
                    />

                    {/* Быстрые кнопки */}
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            type="button" 
                            onClick={() => handleQuickSet(1)} 
                            className={`${baseBtnClass} ${activeButton === 1 ? activeClass : inactiveClass}`}
                        >
                            +1 Час
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleQuickSet(3)} 
                            className={`${baseBtnClass} ${activeButton === 3 ? activeClass : inactiveClass}`}
                        >
                            +3 Часа
                        </button>
                        <button 
                            type="button" 
                            onClick={handleMorningSet} 
                            className={`${baseBtnClass} ${activeButton === 'morning' ? activeClass : inactiveClass}`}
                        >
                            Завтра 9:00
                        </button>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200 flex items-center justify-center gap-2 text-base"
                        >
                            <Check size={20} /> Подтвердить
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}