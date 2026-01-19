'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles, Search, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface CatalogItem { id: number; name: string; price: string; }
interface TemplateItem { item_id: number; item_name?: string; quantity: number; }
interface Template { id: number; name: string; description_template: string; items: any[] }

export default function TemplatesTab() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [catalog, setCatalog] = useState<CatalogItem[]>([]);
    
    // Create Mode
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '', description_template: ''
    });
    const [selectedItems, setSelectedItems] = useState<TemplateItem[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Загружаем шаблоны и каталог для выбора
        Promise.all([
            fetch(`${API_URL}/api/billing/templates/`, { headers }).then(r => r.json()),
            fetch(`${API_URL}/api/billing/catalog/`, { headers }).then(r => r.json())
        ]).then(([tpls, cats]) => {
            setTemplates(tpls);
            setCatalog(cats);
        });
    }, []);

    const addItemToTemplate = (catId: string) => {
        const item = catalog.find(c => c.id === Number(catId));
        if(!item) return;
        
        setSelectedItems(prev => [...prev, { item_id: item.id, item_name: item.name, quantity: 1 }]);
    };

    const removeItem = (idx: number) => {
        setSelectedItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        const token = localStorage.getItem('access_token');
        const payload = {
            ...formData,
            items: selectedItems
        };

        const res = await fetch(`${API_URL}/api/billing/templates/`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const newTmpl = await res.json();
            setTemplates(prev => [...prev, newTmpl]);
            setIsCreating(false);
            setFormData({ name: '', description_template: '' });
            setSelectedItems([]);
        }
    };

    const handleDelete = async (id: number) => {
        if(!confirm('Удалить шаблон?')) return;
        const token = localStorage.getItem('access_token');
        await fetch(`${API_URL}/api/billing/templates/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setTemplates(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="flex h-[600px]">
            {/* LEFT: LIST */}
            <div className="w-1/3 border-r border-gray-100 p-4 overflow-y-auto">
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-full mb-4 py-3 border-2 border-dashed border-purple-200 rounded-xl text-purple-600 font-bold hover:bg-purple-50 transition flex justify-center items-center gap-2"
                >
                    <Plus size={20} /> Создать шаблон
                </button>

                <div className="space-y-3">
                    {templates.map(t => (
                        <div key={t.id} className="p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-300 group relative shadow-sm">
                            <div className="font-bold text-gray-800 flex items-center gap-2">
                                <Sparkles size={16} className="text-purple-500" />
                                {t.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {t.description_template || 'Без текста'}
                            </div>
                            <div className="mt-2 text-xs font-bold text-gray-400 bg-gray-50 inline-block px-2 py-1 rounded-md">
                                {t.items.length} товаров/услуг
                            </div>
                            
                            <button onClick={() => handleDelete(t.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: EDITOR */}
            <div className="w-2/3 p-6 bg-gray-50/50">
                {!isCreating ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Sparkles size={48} className="mb-4 opacity-20" />
                        <p>Выберите "Создать шаблон", чтобы добавить новый макрос</p>
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-700">
                            <Sparkles size={20} /> Новый макрос
                        </h2>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Название шаблона</label>
                                <input 
                                    className="w-full border rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-purple-100" 
                                    placeholder="Например: Стерилизация кошки"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Авто-текст описания</label>
                                <textarea 
                                    rows={4}
                                    className="w-full border rounded-xl p-3 mt-1 resize-none outline-none focus:ring-2 focus:ring-purple-100 text-sm" 
                                    placeholder="Этот текст автоматически вставится в поле Описание..."
                                    value={formData.description_template}
                                    onChange={e => setFormData({...formData, description_template: e.target.value})}
                                />
                            </div>

                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <label className="text-xs font-bold text-purple-700 uppercase mb-2 block">Авто-добавление в чек</label>
                                
                                <select 
                                    className="w-full p-2 mb-3 rounded-lg border border-purple-200 text-sm"
                                    onChange={(e) => { addItemToTemplate(e.target.value); e.target.value=""; }}
                                >
                                    <option value="">+ Добавить услугу или товар...</option>
                                    {catalog.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.price} €)</option>
                                    ))}
                                </select>

                                <div className="space-y-2">
                                    {selectedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-purple-100 text-sm">
                                            <span>{item.item_name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-gray-500">x{item.quantity}</span>
                                                <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedItems.length === 0 && <div className="text-xs text-gray-400 italic">Список пуст</div>}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100">
                            <button onClick={() => setIsCreating(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Отмена</button>
                            <button onClick={handleSave} className="flex-1 py-2.5 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-200 flex justify-center items-center gap-2">
                                <Check size={18} /> Сохранить шаблон
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}