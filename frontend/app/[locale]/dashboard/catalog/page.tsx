'use client';

import React, { useState } from 'react';
import { Package, Sparkles, Plus } from 'lucide-react';
import CatalogTab from '@/components/billing/CatalogTab';
import TemplatesTab from '@/components/billing/TemplatesTab';

export default function CatalogPage() {
    const [activeTab, setActiveTab] = useState<'items' | 'templates'>('items');

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Справочники и Цены</h1>
                    <p className="text-gray-500 text-sm">Управление услугами, товарами и готовыми шаблонами приемов</p>
                </div>
            </div>

            {/* TABS */}
            <div className="border-b border-gray-200">
                <div className="flex gap-8">
                    <button 
                        onClick={() => setActiveTab('items')}
                        className={`pb-4 flex items-center gap-2 text-sm font-bold transition border-b-2 ${
                            activeTab === 'items' 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Package size={18} />
                        Товары и Услуги
                    </button>
                    <button 
                        onClick={() => setActiveTab('templates')}
                        className={`pb-4 flex items-center gap-2 text-sm font-bold transition border-b-2 ${
                            activeTab === 'templates' 
                            ? 'border-purple-600 text-purple-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Sparkles size={18} />
                        Шаблоны (Макросы)
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[60vh]">
                {activeTab === 'items' ? <CatalogTab /> : <TemplatesTab />}
            </div>
        </div>
    );
}