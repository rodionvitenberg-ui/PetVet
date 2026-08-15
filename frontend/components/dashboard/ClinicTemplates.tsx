'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Check, X } from 'lucide-react';
import { ExamTemplate } from '@/types/clinic';
import { fetchTemplates, createTemplate, deleteTemplate } from '@/services/clinicService';
import { addToast } from "@heroui/toast";

interface ClinicTemplatesProps {
  clinicId: number;
}

const CATEGORIES = [
  { value: 'examination', label: 'Examination' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'parasite', label: 'Parasite Treatment' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'laboratory', label: 'Laboratory' },
  { value: 'other', label: 'Other' },
];

export default function ClinicTemplates({ clinicId }: ClinicTemplatesProps) {
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'examination', default_fields: '{}' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [clinicId]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchTemplates(clinicId);
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let fields = {};
      try { fields = JSON.parse(form.default_fields); } catch { /* use empty object */ }
      await createTemplate(clinicId, { name: form.name, category: form.category, default_fields: fields });
      addToast({ title: "Template created", color: "success", variant: "flat" });
      setShowCreate(false);
      setForm({ name: '', category: 'examination', default_fields: '{}' });
      load();
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, color: "danger", variant: "flat" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate(clinicId, id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      addToast({ title: "Template deleted", color: "default", variant: "flat" });
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, color: "danger", variant: "flat" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">Pre-filled templates for quick examination records.</p>
        <button
          onClick={() => setShowCreate(prev => !prev)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-black text-white hover:bg-gray-800 transition"
        >
          {showCreate ? <X size={16} /> : <Plus size={16} />}
          {showCreate ? 'Cancel' : 'New Template'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Template Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Annual Checkup — Dog"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Category</label>
            <select
              className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Default Fields (JSON)</label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-100 outline-none resize-none"
              value={form.default_fields}
              onChange={e => setForm({ ...form, default_fields: e.target.value })}
              placeholder='{"title": "Annual Checkup", "description": "", "status": "planned"}'
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving || !form.name.trim()}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save Template
          </button>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm">
          No templates yet. Create one to speed up your examinations.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white transition"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  template.category === 'vaccination' ? 'bg-blue-100 text-blue-700' :
                  template.category === 'surgery' ? 'bg-red-100 text-red-700' :
                  template.category === 'examination' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                </span>
                <span className="text-sm font-bold text-gray-800">{template.name}</span>
              </div>
              <button
                onClick={() => handleDelete(template.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}