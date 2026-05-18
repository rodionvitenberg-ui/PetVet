'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, Check, Trash2, Paperclip, Activity, Heart, Trophy, Sparkles, HelpCircle, ShoppingCart, Plus, Coins, Receipt } from 'lucide-react';
import { EventType } from '@/types/event';
import { addToast } from "@heroui/toast";

// === ТИПЫ ===
interface CatalogItem {
    id: number;
    name: string;
    price: string; // API часто отдает Decimal как строку
    item_type: 'service' | 'good';
}

interface InvoiceItemDraft {
    item_id: number;
    name: string;
    price: number;
    quantity: number;
}

interface Template {
    id: number;
    name: string;
    description_template: string;
    items: { item_id: number; item_name: string; item_price: string; quantity: number }[];
}

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    petId: number;
    initialData?: any; // Редактирование
    initialTab?: 'info' | 'billing'; // [UPD] Новый проп для выбора стартовой вкладки
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const CATEGORY_CONFIG: Record<string, { label: string, icon: any, color: string }> = {
    medical: { label: 'Медицина', icon: Activity, color: 'text-red-500 bg-red-50' },
    reproduction: { label: 'Репродукция', icon: Heart, color: 'text-pink-500 bg-pink-50' },
    show: { label: 'Документы', icon: Trophy, color: 'text-amber-500 bg-amber-50' },
    care: { label: 'Груминг', icon: Sparkles, color: 'text-purple-500 bg-purple-50' },
    other: { label: 'Другое', icon: HelpCircle, color: 'text-gray-500 bg-gray-50' },
};

export default function CreateEventModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    petId, 
    initialData, 
    initialTab = 'info' // [UPD] Дефолтное значение
}: CreateEventModalProps) {
    
    // UI State [UPD] Инициализируем из пропса
    const [activeTab, setActiveTab] = useState<'info' | 'billing'>('info');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTypes, setIsLoadingTypes] = useState(false);
    
    // Data State
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    
    // Form State (Event)
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        status: 'completed',
        title: '',
        date: '',
        next_date: '',
        description: ''
    });
    
    // Form State (Billing)
    const [invoiceItems, setInvoiceItems] = useState<InvoiceItemDraft[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helpers
    const getCurrentDateTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    const formatApiDateToInput = (isoString?: string) => {
        if (!isoString) return '';
        return isoString.replace(' ', 'T').slice(0, 16);
    };

    // === LOAD DATA ===
    useEffect(() => {
        if (isOpen) {
            // [UPD] Устанавливаем вкладку при открытии
            setActiveTab(initialTab);

            const token = localStorage.getItem('access_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            setIsLoadingTypes(true);
            Promise.all([
                fetch(`${API_URL}/api/event-types/`, { headers }).then(r => r.json()),
                fetch(`${API_URL}/api/billing/templates/`, { headers }).then(r => r.json()), // Загружаем макросы
                fetch(`${API_URL}/api/billing/catalog/`, { headers }).then(r => r.json())    // Загружаем каталог
            ])
            .then(([typesData, templatesData, catalogData]) => {
                setEventTypes(typesData);
                setTemplates(templatesData);
                setCatalog(catalogData);
            })
            .catch(console.error)
            .finally(() => setIsLoadingTypes(false));

            // Reset Form
            if (initialData) {
                // Edit Logic (упрощено, файлы и биллинг при редактировании пока не трогаем для MVP)
                setFormData({
                    status: initialData.status || 'completed',
                    title: initialData.title || '',
                    date: formatApiDateToInput(initialData.date),
                    next_date: formatApiDateToInput(initialData.next_date),
                    description: initialData.description || ''
                });
                setSelectedTypeId(initialData.event_type?.id);
            } else {
                // Create Logic
                setFormData({
                    status: 'completed',
                    title: '',
                    date: getCurrentDateTime(),
                    next_date: '',
                    description: ''
                });
                setSelectedTypeId(null);
                setInvoiceItems([]);
            }
            setFiles([]);
        }
    }, [isOpen, initialData, initialTab]); // [UPD] Добавил initialTab в зависимости

    // === HANDLERS ===
    
    // 1. Применение макроса
    const applyTemplate = (templateId: string) => {
        const tmpl = templates.find(t => t.id === Number(templateId));
        if (!tmpl) return;

        // Заполняем описание (если пустое, или добавляем в конец)
        setFormData(prev => ({
            ...prev,
            description: prev.description ? prev.description + '\n' + tmpl.description_template : tmpl.description_template
        }));

        // Добавляем товары в чек
        const newItems = tmpl.items.map(i => ({
            item_id: i.item_id,
            name: i.item_name,
            price: Number(i.item_price),
            quantity: i.quantity
        }));
        
        setInvoiceItems(prev => [...prev, ...newItems]);
        
        alert(`Applied template "${tmpl.name}": description added and ${newItems.length} items added to invoice.`);
    };

    // 2. Добавление товара вручную
    const addInvoiceItem = (catalogItemId: string) => {
        const item = catalog.find(c => c.id === Number(catalogItemId));
        if (!item) return;

        setInvoiceItems(prev => [
            ...prev, 
            { item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }
        ]);
    };

    const updateItemQuantity = (index: number, delta: number) => {
        setInvoiceItems(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeInvoiceItem = (index: number) => {
        setInvoiceItems(prev => prev.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return invoiceItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    };

    // 3. Сохранение
const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // [TOAST] Валидация типа события
        if (!selectedTypeId) {
            addToast({ 
                title: "Event type not selected", 
                description: "Please select a type from the list", 
                color: "danger", 
                variant: "flat" 
            });
            return;
        }

        setIsSubmitting(true);
        const token = localStorage.getItem('access_token');

        try {
            // ШАГ 1: Создаем Событие
            const eventPayload = new FormData();
            if (!initialData) eventPayload.append('pet', petId.toString());
            eventPayload.append('event_type_id', selectedTypeId.toString());
            
            // --- НОВАЯ ЛОГИКА СТАТУСА ---
            let calculatedStatus = formData.status;
            if (!initialData) { // Вычисляем статус только для новых событий
                const eventDate = new Date(formData.date);
                const now = new Date();
                calculatedStatus = eventDate > now ? 'planned' : 'completed';
            }
            eventPayload.append('status', calculatedStatus);
            // ----------------------------

            eventPayload.append('title', formData.title);
            eventPayload.append('date', formData.date.replace('T', ' '));
            eventPayload.append('description', formData.description);
            if (formData.next_date) eventPayload.append('next_date', formData.next_date.replace('T', ' '));
            
            // Файлы
            files.forEach(f => eventPayload.append('attachments', f));

            const eventUrl = initialData 
                ? `${API_URL}/api/events/${initialData.id}/` 
                : `${API_URL}/api/events/`;
            
            const eventRes = await fetch(eventUrl, {
                method: initialData ? 'PATCH' : 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: eventPayload
            });

            if (!eventRes.ok) {
                const errData = await eventRes.json();
                throw new Error(typeof errData === 'object' ? JSON.stringify(errData) : 'Error saving event');
            }
            
            const eventData = await eventRes.json();
            let invoiceCreated = false;

            // ШАГ 2: Создаем Счет (Если есть товары и это не редактирование)
            if (invoiceItems.length > 0 && !initialData) {
                const invoicePayload = {
                    pet: petId,
                    event: eventData.id,
                    status: 'unpaid',
                    items: invoiceItems.map(i => ({
                        item_id: i.item_id,
                        quantity: i.quantity
                    }))
                };

                const invoiceRes = await fetch(`${API_URL}/api/billing/invoices/`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify(invoicePayload)
                });
                
                if (!invoiceRes.ok) {
                    console.error("Error creating invoice", await invoiceRes.json());
                    // Можно показать warning, что событие создано, но счет нет
                    addToast({ title: "Warning", description: "Event created, but there was an error creating the invoice", color: "warning", variant: "flat" });
                } else {
                    invoiceCreated = true;
                }
            }

            // [TOAST] УСПЕХ
            const action = initialData ? "updated" : "created";
            const extraInfo = invoiceCreated ? ". Invoice generated." : "";
            
            addToast({ 
                title: `Event ${action}`, 
                description: `Record saved successfully${extraInfo}`, 
                color: "success", 
                variant: "flat" 
            });

            onSuccess();
            onClose();

        } catch (error: any) {
            console.error(error);
            // [TOAST] ОШИБКА
            // Пытаемся достать текст ошибки, если он пришел в JSON строке
            let errorMsg = "An error occurred while saving";
            try {
                // Если error.message это JSON (например от DRF), пробуем его распарсить для красоты
                if (error.message.includes('{')) {
                    errorMsg = "Validation error"; 
                } else {
                    errorMsg = error.message;
                }
            } catch {}

            addToast({ 
                title: "Error", 
                description: errorMsg, 
                color: "danger", 
                variant: "flat" 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Группировка типов
    const groupedTypes = eventTypes.reduce((acc, type) => {
        const cat = type.category || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(type);
        return acc;
    }, {} as Record<string, EventType[]>);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                {/* HEADER & TABS */}
                <div className="bg-gray-50 border-b border-gray-100">
                    <div className="px-6 py-4 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            {activeTab === 'info' ? <FileText className="text-blue-500" /> : <Receipt className="text-green-500" />}
                            {initialData ? 'Editing' : 'New Event'}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><X size={20} /></button>
                    </div>
                    
                    {/* TABS SWITCHER */}
                    <div className="flex px-6 gap-6">
                        <button 
                            onClick={() => setActiveTab('info')}
                            className={`pb-3 text-sm font-bold border-b-2 transition ${activeTab === 'info' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Main
                        </button>
                        <button 
                            onClick={() => setActiveTab('billing')}
                            className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${activeTab === 'billing' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Invoice and Items
                            {invoiceItems.length > 0 && (
                                <span className="bg-green-100 text-green-700 px-1.5 rounded-md text-[10px]">{invoiceItems.length}</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                    <form id="event-form" onSubmit={handleSubmit}>
                        
                        {/* === TAB 1: INFO === */}
                        {activeTab === 'info' && (
                            <div className="space-y-6">
                                {/* ШАБЛОНЫ (MACROS) */}
                                {!initialData && (
                                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-xl border border-purple-100 flex items-center gap-3">
                                        <Sparkles className="text-purple-500" size={18} />
                                        <select 
                                            onChange={(e) => applyTemplate(e.target.value)}
                                            className="bg-transparent text-sm font-bold text-gray-700 outline-none w-full cursor-pointer"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>✨ Select a quick template (Macro)...</option>
                                            {templates.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.items.length} services)</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* ТИПЫ СОБЫТИЙ */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Event Type</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {Object.entries(groupedTypes).map(([catKey, types]) => {
                                             const catConfig = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.other;
                                             return types.map(type => (
                                                <button
                                                    key={type.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedTypeId(type.id);
                                                        if(!formData.title) setFormData({...formData, title: type.name});
                                                    }}
                                                    className={`text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all truncate flex items-center gap-2 ${
                                                        selectedTypeId === type.id 
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' 
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${catConfig.color.replace('text-', 'bg-').split(' ')[0]}`} />
                                                    {type.name}
                                                </button>
                                             ));
                                        })}
                                    </div>
                                </div>

                                {/* ПОЛЯ */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                                        <input type="datetime-local" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border rounded-lg p-2 text-sm mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">Title</label>
                                        <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border rounded-lg p-2 text-sm mt-1" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                                    <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border rounded-lg p-2 text-sm mt-1 resize-none" placeholder="Anamnesis, complaints, treatment..." />
                                </div>
                                
                                {/* Файлы (упрощенно) */}
                                <div onClick={() => fileInputRef.current?.click()} className="border-dashed border-2 border-gray-200 rounded-xl p-4 flex justify-center items-center gap-2 cursor-pointer hover:bg-gray-50 text-gray-500 text-sm">
                                    <Paperclip size={16} /> Attach Files ({files.length})
                                    <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => e.target.files && setFiles(Array.from(e.target.files))} />
                                </div>
                            </div>
                        )}

                        {/* === TAB 2: BILLING === */}
                        {activeTab === 'billing' && (
                            <div className="space-y-6 h-full flex flex-col">
                                {/* ПОИСК ТОВАРА */}
                                <div className="relative">
                                    <ShoppingCart className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <select 
                                        onChange={(e) => { addInvoiceItem(e.target.value); e.target.value = ""; }}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-200 appearance-none cursor-pointer"
                                    >
                                        <option value="">🔍 Find a service or product...</option>
                                        {catalog.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} — {item.price} €
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* ТАБЛИЦА */}
                                <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl">
                                    {invoiceItems.length === 0 ? (
                                        <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-sm">
                                            <Coins size={32} className="mb-2 opacity-20" />
                                            Service list is empty
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
                                                <tr>
                                                    <th className="px-4 py-3">Name</th>
                                                    <th className="px-2 py-3 w-20 text-center">Quantity</th>
                                                    <th className="px-4 py-3 text-right">Total</th>
                                                    <th className="w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {invoiceItems.map((item, idx) => (
                                                    <tr key={idx} className="group hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium text-gray-700">{item.name}</td>
                                                        <td className="px-2 py-3 flex items-center justify-center gap-2">
                                                            <button type="button" onClick={() => updateItemQuantity(idx, -1)} className="text-gray-400 hover:text-red-500">-</button>
                                                            <span className="w-4 text-center">{item.quantity}</span>
                                                            <button type="button" onClick={() => updateItemQuantity(idx, 1)} className="text-gray-400 hover:text-green-500">+</button>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-800 font-mono">
                                                            {(item.price * item.quantity).toFixed(2)}
                                                        </td>
                                                        <td className="text-center">
                                                            <button type="button" onClick={() => removeInvoiceItem(idx)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>

                                {/* ИТОГО */}
                                <div className="flex justify-between items-center bg-green-50 p-4 rounded-xl border border-green-100">
                                    <span className="text-green-800 font-bold uppercase text-xs">Total to Pay</span>
                                    <span className="text-2xl font-bold text-green-700">{calculateTotal().toFixed(2)} €</span>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* FOOTER */}
                <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    {/* Если мы в биллинге, покажем кнопку "Назад" */}
                    {activeTab === 'billing' && (
                        <button onClick={() => setActiveTab('info')} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition">
                            Back
                        </button>
                    )}
                    
                    <button 
                        form="event-form"
                        disabled={isSubmitting}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                        {isSubmitting ? 'Saving...' : (
                            <>
                                <Check size={18} />
                                {invoiceItems.length > 0 ? 'Save and Issue Invoice' : 'Save'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}