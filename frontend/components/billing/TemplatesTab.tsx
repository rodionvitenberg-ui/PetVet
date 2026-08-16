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
            <div className="w-1/3 border-r border-border p-4 overflow-y-auto">
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-full mb-4 py-3 border-2 border-dashed border-primary/20 rounded-xl text-primary font-bold hover:bg-primary/10 transition flex justify-center items-center gap-2"
                >
                    <Plus size={20} /> Create Template
                </button>

                <div className="space-y-3">
                    {templates.map(t => (
                        <div key={t.id} className="p-4 bg-card border border-border rounded-xl hover:border-primary/40 group relative shadow-sm">
                            <div className="font-bold text-foreground flex items-center gap-2">
                                <Sparkles size={16} className="text-primary" />
                                {t.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {t.description_template || 'Без текста'}
                            </div>
                            <div className="mt-2 text-xs font-bold text-muted-foreground bg-muted inline-block px-2 py-1 rounded-md">
                                {t.items.length} items/services
                            </div>
                            
                            <button onClick={() => handleDelete(t.id)} className="absolute top-3 right-3 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: EDITOR */}
            <div className="w-2/3 p-6 bg-muted/50">
                {!isCreating ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Sparkles size={48} className="mb-4 opacity-20" />
                        <p>Select "Create Template" to add a new macro</p>
                    </div>
                ) : (
                    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border h-full flex flex-col">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-primary">
                            <Sparkles size={20} /> New Macro
                        </h2>

                        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Template Name</label>
                                <input 
                                    className="w-full border rounded-xl p-3 mt-1 outline-none focus:ring-2 focus:ring-purple-100" 
                                    placeholder="For example: Cat Sterilization"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase">Auto-Description Text</label>
                                <textarea 
                                    rows={4}
                                    className="w-full border rounded-xl p-3 mt-1 resize-none outline-none focus:ring-2 focus:ring-purple-100 text-sm" 
                                    placeholder="This text will be automatically inserted into the Description field..."
                                    value={formData.description_template}
                                    onChange={e => setFormData({...formData, description_template: e.target.value})}
                                />
                            </div>

                            <div className="bg-primary/10 p-4 rounded-xl border border-primary/15">
                                <label className="text-xs font-bold text-primary uppercase mb-2 block">Auto-Add to Receipt</label>
                                
                                <select 
                                    className="w-full p-2 mb-3 rounded-lg border border-primary/20 text-sm"
                                    onChange={(e) => { addItemToTemplate(e.target.value); e.target.value=""; }}
                                >
                                    <option value="">+ Add Service or Product...</option>
                                    {catalog.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.price} €)</option>
                                    ))}
                                </select>

                                <div className="space-y-2">
                                    {selectedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-card p-2 rounded-lg border border-primary/15 text-sm">
                                            <span>{item.item_name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-muted-foreground">x{item.quantity}</span>
                                                <button onClick={() => removeItem(idx)} className="text-destructive hover:text-destructive"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedItems.length === 0 && <div className="text-xs text-muted-foreground italic">List is empty</div>}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3 pt-4 border-t border-border">
                            <button onClick={() => setIsCreating(false)} className="px-6 py-2.5 text-muted-foreground font-bold hover:bg-muted rounded-xl transition">Cancel</button>
                            <button onClick={handleSave} className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary transition shadow-lg shadow-primary/20 flex justify-center items-center gap-2">
                                <Check size={18} /> Save Template
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}