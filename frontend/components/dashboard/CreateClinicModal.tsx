'use client';

import React, { useState } from 'react';
import { X, Building2, Loader2 } from 'lucide-react';
import { createClinic } from '@/services/clinicService';
import { addToast } from "@heroui/toast";

interface CreateClinicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateClinicModal({ isOpen, onClose, onCreated }: CreateClinicModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      await createClinic(form);
      addToast({ title: "Clinic created!", color: "success", variant: "flat" });
      onCreated();
      onClose();
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, color: "danger", variant: "flat" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Building2 size={20} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Create Clinic</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Clinic Name *</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-200 outline-none transition"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Happy Paws Clinic"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Address</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-200 outline-none transition"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Phone</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Description</label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-200 outline-none transition resize-none"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of your clinic..."
            />
          </div>
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-md"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Building2 size={18} />}
            Create Clinic
          </button>
        </form>
      </div>
    </div>
  );
}