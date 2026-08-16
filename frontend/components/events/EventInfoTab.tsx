'use client';

import React from 'react';
import {
  Activity, Heart, Trophy, Sparkles, HelpCircle, Paperclip
} from 'lucide-react';
import { EventType } from '@/types/event';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Template, EventFormData } from './types';

interface EventInfoTabProps {
  eventTypes: EventType[];
  templates: Template[];
  formData: EventFormData;
  files: File[];
  selectedTypeId: number | null;
  isNew: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectType: (id: number) => void;
  onFormChange: (data: EventFormData) => void;
  onApplyTemplate: (templateId: string) => void;
  onFilesChange: (files: File[]) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  medical: { label: 'Медицина', icon: Activity, color: 'text-destructive bg-destructive/10' },
  reproduction: { label: 'Репродукция', icon: Heart, color: 'text-accent bg-accent/15' },
  show: { label: 'Документы', icon: Trophy, color: 'text-accent-foreground bg-accent/20' },
  care: { label: 'Груминг', icon: Sparkles, color: 'text-primary bg-primary/10' },
  other: { label: 'Другое', icon: HelpCircle, color: 'text-muted-foreground bg-muted' },
};

export default function EventInfoTab({
  eventTypes,
  templates,
  formData,
  files,
  selectedTypeId,
  isNew,
  fileInputRef,
  onSelectType,
  onFormChange,
  onApplyTemplate,
  onFilesChange,
}: EventInfoTabProps) {
  const groupedTypes = eventTypes.reduce((acc, type) => {
    const cat = type.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(type);
    return acc;
  }, {} as Record<string, EventType[]>);

  return (
    <div className="space-y-6">
      {isNew && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 p-3">
          <Sparkles className="text-primary" size={18} />
          <select
            onChange={(e) => onApplyTemplate(e.target.value)}
            className="w-full cursor-pointer bg-transparent text-sm font-bold text-foreground outline-none"
            defaultValue=""
          >
            <option value="" disabled>✨ Select a quick template (Macro)...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.items.length} services)</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Event Type</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(groupedTypes).map(([catKey, types]) => {
            const catConfig = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.other;
            return types.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  onSelectType(type.id);
                  if (!formData.title) onFormChange({ ...formData, title: type.name });
                }}
                className={`flex items-center gap-2 truncate rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all ${
                  selectedTypeId === type.id
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-input'
                }`}
              >
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${catConfig.color.split(' ')[0]}`} />
                {type.name}
              </button>
            ));
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="datetime-local" required value={formData.date} onChange={e => onFormChange({ ...formData, date: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input type="text" required value={formData.title} onChange={e => onFormChange({ ...formData, title: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea rows={4} className="resize-none" value={formData.description} onChange={e => onFormChange({ ...formData, description: e.target.value })} placeholder="Anamnesis, complaints, treatment..." />
      </div>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-input p-4 text-sm text-muted-foreground transition hover:bg-muted"
      >
        <Paperclip size={16} /> Attach Files ({files.length})
        <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => e.target.files && onFilesChange(Array.from(e.target.files))} />
      </button>
    </div>
  );
}