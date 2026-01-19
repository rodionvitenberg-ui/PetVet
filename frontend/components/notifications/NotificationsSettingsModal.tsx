'use client';

import React, { useEffect, useState } from 'react';
import { X, Bell, Volume2, Smartphone, Monitor, Activity, Heart, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface Settings {
    email_enabled: boolean;
    push_enabled: boolean;
    browser_enabled: boolean;
    sound_enabled: boolean;
    notify_medical: boolean;
    notify_care: boolean;
    notify_reproduction: boolean;
    notify_system: boolean;
    reminder_time_minutes: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function NotificationSettingsModal({ isOpen, onClose }: Props) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && user) {
            fetchSettings();
        }
    }, [isOpen, user]);

    const fetchSettings = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_URL}/api/notification-settings/me/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setSettings(await res.json());
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    const updateSetting = async (key: keyof Settings, value: any) => {
        // Оптимистичное обновление
        setSettings(prev => prev ? { ...prev, [key]: value } : null);

        const token = localStorage.getItem('access_token');
        try {
            await fetch(`${API_URL}/api/notification-settings/me/`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [key]: value })
            });
        } catch (e) {
            console.error('Failed to save setting');
            fetchSettings(); // Откат при ошибке
        }
    };

    if (!isOpen || !settings) return null;

    const Toggle = ({ label, icon: Icon, field }: { label: string, icon: any, field: keyof Settings }) => (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settings[field] ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                    <Icon size={18} />
                </div>
                <span className="text-sm font-bold text-gray-700">{label}</span>
            </div>
            <button 
                onClick={() => updateSetting(field, !settings[field])}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${settings[field] ? 'bg-blue-500' : 'bg-gray-300'}`}
            >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${settings[field] ? 'translate-x-5' : ''}`} />
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        <Bell className="text-blue-500" /> Настройки уведомлений
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    
                    {/* КАНАЛЫ */}
                    <section>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Где уведомлять?</h4>
                        <div className="space-y-2">
                            <Toggle label="Браузер (Всплывашки)" icon={Monitor} field="browser_enabled" />
                            <Toggle label="Мобильный Push" icon={Smartphone} field="push_enabled" />
                            <Toggle label="Звук" icon={Volume2} field="sound_enabled" />
                        </div>
                    </section>

                    {/* КАТЕГОРИИ */}
                    <section>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">О чем сообщать?</h4>
                        <div className="space-y-2">
                            <Toggle label="Здоровье и Процедуры" icon={Activity} field="notify_medical" />
                            <Toggle label="Уход (Груминг)" icon={ShieldCheck} field="notify_care" />
                            <Toggle label="Репродукция" icon={Heart} field="notify_reproduction" />
                        </div>
                    </section>

                    {/* ВРЕМЯ */}
                    <section>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Когда напоминать?</h4>
                        <select 
                            value={settings.reminder_time_minutes}
                            onChange={(e) => updateSetting('reminder_time_minutes', Number(e.target.value))}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-100"
                        >
                            <option value={15}>За 15 минут</option>
                            <option value={30}>За 30 минут</option>
                            <option value={60}>За 1 час</option>
                            <option value={120}>За 2 часа</option>
                            <option value={1440}>За 24 часа</option>
                        </select>
                    </section>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition">
                        Готово
                    </button>
                </div>
            </div>
        </div>
    );
}