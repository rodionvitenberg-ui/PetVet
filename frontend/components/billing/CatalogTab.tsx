'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, Package, Activity, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface CatalogItem {
    id: number;
    name: string;
    code: string;
    item_type: 'service' | 'good';
    price: string;
    stock_quantity: number;
}

export default function CatalogTab() {
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '', code: '', item_type: 'service', price: '', stock_quantity: 0
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_URL}/api/billing/catalog/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setItems(await res.json());
        } catch (e) { console.error(e); } 
        finally { setIsLoading(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('access_token');
        try {
            const res = await fetch(`${API_URL}/api/billing/catalog/`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ name: '', code: '', item_type: 'service', price: '', stock_quantity: 0 });
                fetchItems();
            } else {
                alert("Error. Perhaps such a code already exists.");
            }
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: number) => {
        if(!confirm('Delete item?')) return;
        const token = localStorage.getItem('access_token');
        await fetch(`${API_URL}/api/billing/catalog/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const filteredItems = items.filter(i => 
        i.name.toLowerCase().includes(search.toLowerCase()) || 
        i.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6">
            {/* TOOLBAR */}
            <div className="flex justify-between items-center mb-6">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by name or code..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <Plus size={18} /> Add Item
                </button>
            </div>

            {/* TABLE */}
            <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Code</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3 text-right">Price</th>
                            <th className="px-6 py-3 text-center">Stock</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredItems.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 group">
                                <td className="px-6 py-3 font-mono text-gray-500">{item.code}</td>
                                <td className="px-6 py-3 font-medium text-gray-900">{item.name}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${item.item_type === 'service' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {item.item_type === 'service' ? 'Service' : 'Good'}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-gray-700">{item.price} €</td>
                                <td className="px-6 py-3 text-center text-gray-500">
                                    {item.item_type === 'good' ? item.stock_quantity : '-'}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-500 transition">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredItems.length === 0 && (
                    <div className="p-10 text-center text-gray-400">No items found</div>
                )}
            </div>

            {/* CREATE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
                        <h2 className="text-lg font-bold mb-4">New Item</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Type</label>
                                    <select 
                                        value={formData.item_type}
                                        onChange={e => setFormData({...formData, item_type: e.target.value as any})}
                                        className="w-full border rounded-lg p-2.5 bg-gray-50"
                                    >
                                        <option value="service">Service</option>
                                        <option value="good">Good</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Code (GOT)</label>
                                    <input required className="w-full border rounded-lg p-2.5" placeholder="A-101" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Name</label>
                                <input required className="w-full border rounded-lg p-2.5" placeholder="e.g.: Vaccination" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Price (€)</label>
                                    <input required type="number" step="0.01" className="w-full border rounded-lg p-2.5" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                                </div>
                                {formData.item_type === 'good' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">Stock</label>
                                        <input type="number" className="w-full border rounded-lg p-2.5" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: Number(e.target.value)})} />
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 rounded-xl font-bold text-gray-600">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 rounded-xl font-bold text-white">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}