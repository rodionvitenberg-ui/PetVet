'use client';

import React, { useState } from 'react';
import { 
    X, Phone, Mail, MapPin, Stethoscope, 
    User, Send, Copy, Check, Briefcase,
    MessageCircle, Instagram, Globe, ArrowUpRight 
} from 'lucide-react';
import { UserProfile } from '@/types/pet'; 

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getAvatarUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
};

// Хелпер для выбора иконки и цвета на основе типа контакта
const getContactConfig = (type: string) => {
    switch (type) {
        case 'whatsapp': return { icon: <MessageCircle size={18} />, color: 'text-green-600', bg: 'bg-green-100', label: 'WhatsApp' };
        case 'telegram': return { icon: <Send size={18} />, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Telegram' };
        case 'instagram': return { icon: <Instagram size={18} />, color: 'text-pink-600', bg: 'bg-pink-100', label: 'Instagram' };
        case 'email': return { icon: <Mail size={18} />, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Email' };
        case 'site': return { icon: <Globe size={18} />, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Сайт' };
        case 'vk': return { icon: <span className="font-bold text-xs">VK</span>, color: 'text-blue-700', bg: 'bg-blue-100', label: 'ВКонтакте' };
        case 'phone': default: return { icon: <Phone size={18} />, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Телефон' };
    }
};

// Хелпер для формирования правильной ссылки (href)
const getContactLink = (type: string, value: string) => {
    const cleanValue = value.replace(/\s+/g, '').replace(/-/g, '').replace('(', '').replace(')', '');
    switch (type) {
        case 'phone': return `tel:${cleanValue}`;
        case 'email': return `mailto:${value}`;
        case 'whatsapp': return `https://wa.me/${cleanValue.startsWith('+') ? cleanValue.substring(1) : cleanValue}`;
        case 'telegram': return `https://t.me/${value.replace('@', '').replace('https://t.me/', '')}`;
        case 'instagram': return `https://instagram.com/${value.replace('@', '').replace('https://instagram.com/', '')}`;
        case 'site': return value.startsWith('http') ? value : `https://${value}`;
        case 'vk': return value.startsWith('http') ? value : `https://vk.com/${value}`;
        default: return null;
    }
};

export default function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!isOpen || !user) return null;

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const isVet = user.is_veterinarian;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            <div 
                className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Хедер с фоном */}
                <div className={`h-32 ${isVet ? 'bg-emerald-600' : 'bg-blue-600'} relative`}>
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition">
                        <X size={20} />
                    </button>
                    <div className="absolute -bottom-12 left-6 p-1 bg-white rounded-full">
                        <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-sm flex items-center justify-center">
                            {user.avatar ? (
                                <img src={getAvatarUrl(user.avatar)!} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                isVet ? <Stethoscope size={40} className="text-emerald-500" /> : <User size={40} className="text-blue-500" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Основная инфо */}
                <div className="pt-14 pb-6 px-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{user.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                    isVet ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {isVet ? 'Ветеринар' : 'Владелец'}
                                </span>
                                {user.city && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <MapPin size={12} /> {user.city}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {user.clinic_name && isVet && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-emerald-600 border border-gray-100">
                                <Briefcase size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Место работы</p>
                                <p className="font-bold text-gray-800 text-sm">{user.clinic_name}</p>
                            </div>
                        </div>
                    )}

                    {user.about && (
                        <div className="mt-4 text-sm text-gray-600 leading-relaxed bg-yellow-50/50 p-3 rounded-xl border border-yellow-100/50">
                            {user.about}
                        </div>
                    )}

                    {/* ДИНАМИЧЕСКИЕ КОНТАКТЫ */}
                    <div className="mt-6 space-y-3">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Связь</h3>

                        {/* Если контактов ВООБЩЕ нет, показываем старые поля как fallback */}
                        {(!user.contacts || user.contacts.length === 0) && (
                            <>
                                {user.phone && (
                                     <ContactRow 
                                        icon={<Phone size={18} />}
                                        label="Телефон"
                                        value={user.phone}
                                        type="phone"
                                        onCopy={() => copyToClipboard(user.phone!, 'phone')}
                                        isCopied={copiedField === 'phone'}
                                        color="blue"
                                        link={`tel:${user.phone}`}
                                    />
                                )}
                                {user.email && (
                                    <ContactRow 
                                        icon={<Mail size={18} />}
                                        label="Email"
                                        value={user.email}
                                        type="email"
                                        onCopy={() => copyToClipboard(user.email, 'email')}
                                        isCopied={copiedField === 'email'}
                                        color="gray"
                                        link={`mailto:${user.email}`}
                                    />
                                )}
                            </>
                        )}

                        {/* Новый динамический список */}
                        {user.contacts?.map((contact) => {
                            const config = getContactConfig(contact.type);
                            const link = getContactLink(contact.type, contact.value);

                            return (
                                <div key={contact.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-300 transition group bg-white">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bg} ${config.color}`}>
                                        {config.icon}
                                    </div>
                                    
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                                            {contact.label || config.label}
                                        </p>
                                        <p className="font-bold text-gray-800 text-sm truncate">{contact.value}</p>
                                    </div>

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {link && (
                                            <a 
                                                href={link} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="p-2 hover:bg-gray-100 rounded-lg text-blue-600"
                                            >
                                                <ArrowUpRight size={16} />
                                            </a>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(contact.value, contact.type); }} 
                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                                        >
                                            {copiedField === contact.type ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Микро-компонент (для fallback режима)
const ContactRow = ({ icon, label, value, type, onCopy, isCopied, color, link }: any) => {
    const bgClass = color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600';
    
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-300 transition group bg-white">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgClass}`}>
                {icon}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-[10px] text-gray-400 font-bold uppercase">{label}</p>
                <p className="font-bold text-gray-800 text-sm truncate">{value}</p>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {link && (
                     <a href={link} className="p-2 hover:bg-gray-100 rounded-lg text-blue-600" target="_blank" rel="noopener noreferrer">
                        <ArrowUpRight size={16} />
                    </a>
                )}
                <button onClick={(e) => { e.stopPropagation(); onCopy(); }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                    {isCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
            </div>
        </div>
    );
};