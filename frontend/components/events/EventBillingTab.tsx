'use client';

import React from 'react';
import { ShoppingCart, Coins, Trash2 } from 'lucide-react';
import { CatalogItem, InvoiceItemDraft } from './types';

interface EventBillingTabProps {
  catalog: CatalogItem[];
  items: InvoiceItemDraft[];
  onAddItem: (catalogItemId: string) => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
}

const calculateTotal = (items: InvoiceItemDraft[]) =>
  items.reduce((acc, item) => acc + item.price * item.quantity, 0);

export default function EventBillingTab({ catalog, items, onAddItem, onUpdateQuantity, onRemoveItem }: EventBillingTabProps) {
  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="relative">
        <ShoppingCart className="absolute left-3 top-3 text-muted-foreground" size={18} />
        <select
          onChange={(e) => { onAddItem(e.target.value); e.target.value = ""; }}
          className="w-full cursor-pointer appearance-none rounded-xl border border-input bg-muted/40 py-3 pl-10 pr-4 text-sm outline-none transition focus-ring"
        >
          <option value="">🔍 Find a service or product...</option>
          {catalog.map(item => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.price} €
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-border">
        {items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground">
            <Coins size={32} className="mb-2 opacity-20" />
            Service list is empty
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs font-bold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="w-20 px-2 py-3 text-center">Quantity</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, idx) => (
                <tr key={idx} className="group hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                  <td className="flex items-center justify-center gap-2 px-2 py-3">
                    <button type="button" onClick={() => onUpdateQuantity(idx, -1)} className="text-muted-foreground hover:text-destructive">-</button>
                    <span className="w-4 text-center">{item.quantity}</span>
                    <button type="button" onClick={() => onUpdateQuantity(idx, 1)} className="text-muted-foreground hover:text-success">+</button>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">
                    {(item.price * item.quantity).toFixed(2)}
                  </td>
                  <td className="text-center">
                    <button type="button" onClick={() => onRemoveItem(idx)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-success/20 bg-success/10 p-4">
        <span className="text-xs font-bold uppercase text-success">Total to Pay</span>
        <span className="text-2xl font-bold text-success">{calculateTotal(items).toFixed(2)} €</span>
      </div>
    </div>
  );
}