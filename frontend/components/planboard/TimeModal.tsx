'use client';

import React, { useState } from 'react';
import { X, CalendarClock, Check } from 'lucide-react';

interface TimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (date: Date) => void;
}

export default function TimeModal({ isOpen, onClose, onConfirm }: TimeModalProps) {
    if (!isOpen) return null;
    return <TimeModalContent onClose={onClose} onConfirm={onConfirm} />;
}

function getDefaultNow() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
}

function TimeModalContent({ onClose, onConfirm }: { onClose: () => void; onConfirm: (date: Date) => void }) {
    const [dateValue, setDateValue] = useState(getDefaultNow);
    // Состояние для активной кнопки (храним число часов или 'morning')
    const [activeButton, setActiveButton] = useState<string | number | null>(null);

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

    const baseBtnClass = "px-4 py-3 border rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.96] flex items-center justify-center";
    
    const inactiveClass = "bg-card border-border text-muted-foreground hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive";
    const activeClass = "bg-destructive border-destructive text-destructive-foreground shadow-md shadow-destructive/20 transform scale-105 ring-2 ring-destructive/20 ring-offset-1";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-card w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 bg-muted border-b border-border flex justify-between items-center">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <CalendarClock className="text-destructive" size={20} />
                        Specify time
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition text-muted-foreground focus-ring">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="text-sm text-muted-foreground text-center leading-relaxed">
                        You are rescheduling the task to <span className="font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded">URGENT</span><br/>
                        When should it be completed?
                    </div>

                    <input 
                        type="datetime-local" 
                        required
                        value={dateValue}
                        onChange={handleManualChange}
                        className="w-full border border-input rounded-xl p-3 text-lg font-mono text-center outline-none focus-ring bg-background text-foreground transition"
                    />

                    {/* Быстрые кнопки */}
                    <div className="grid grid-cols-3 gap-2">
                        <button 
                            type="button" 
                            onClick={() => handleQuickSet(1)} 
                            className={`${baseBtnClass} ${activeButton === 1 ? activeClass : inactiveClass}`}
                        >
                            +1 Hour
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleQuickSet(3)} 
                            className={`${baseBtnClass} ${activeButton === 3 ? activeClass : inactiveClass}`}
                        >
                            +3 Hours
                        </button>
                        <button 
                            type="button" 
                            onClick={handleMorningSet} 
                            className={`${baseBtnClass} ${activeButton === 'morning' ? activeClass : inactiveClass}`}
                        >
                            Tomorrow 9:00
                        </button>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            className="w-full bg-destructive text-destructive-foreground py-3.5 rounded-xl font-bold hover:bg-destructive/90 transition shadow-lg shadow-destructive/20 flex items-center justify-center gap-2 text-base active:scale-[0.96]"
                        >
                            <Check size={20} /> Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}