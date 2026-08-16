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
                    <h1 className="text-2xl font-bold text-foreground">Catalog</h1>
                    <p className="text-muted-foreground text-sm">Management of services, products and ready-made appointment templates</p>
                </div>
            </div>

            {/* TABS */}
            <div className="border-b border-border">
                <div className="flex gap-8">
                    <button 
                        onClick={() => setActiveTab('items')}
                        className={`pb-4 flex items-center gap-2 text-sm font-bold transition border-b-2 ${
                            activeTab === 'items' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Package size={18} />
                        Items and Services
                    </button>
                    <button 
                        onClick={() => setActiveTab('templates')}
                        className={`pb-4 flex items-center gap-2 text-sm font-bold transition border-b-2 ${
                            activeTab === 'templates' 
                            ? 'border-purple-600 text-primary' 
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Sparkles size={18} />
                        Templates (Macros)
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="bg-card rounded-2xl shadow-sm border border-border min-h-[60vh]">
                {activeTab === 'items' ? <CatalogTab /> : <TemplatesTab />}
            </div>
        </div>
    );
}