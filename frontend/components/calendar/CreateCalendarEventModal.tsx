'use client';
import { addToast } from "@heroui/toast";

import React, { useState, useEffect } from 'react';
import { CalendarClock, User, Phone, Check, Activity, Heart, Trophy, Sparkles, HelpCircle } from 'lucide-react';
import { EventType } from '@/types/event';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CreateCalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialData?: any;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  medical: { label: 'Medicine', icon: Activity, color: 'text-destructive bg-destructive/10' },
  reproduction: { label: 'Reproduction', icon: Heart, color: 'text-accent bg-accent/15' },
  show: { label: 'Documents', icon: Trophy, color: 'text-accent-foreground bg-accent/20' },
  care: { label: 'Grooming', icon: Sparkles, color: 'text-primary bg-primary/10' },
  other: { label: 'Other', icon: HelpCircle, color: 'text-muted-foreground bg-muted' },
};

export default function CreateCalendarEventModal({ isOpen, onClose, onSuccess, initialDate, initialData }: CreateCalendarEventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    description: '',
    guest_name: '',
    guest_phone: '',
    status: 'planned'
  });

  const formatDateForInput = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
  };

  const formatApiDateToInput = (isoString?: string) => {
    if (!isoString) return '';
    return isoString.replace(' ', 'T').slice(0, 16);
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoadingTypes(true);
      const token = localStorage.getItem('access_token');
      fetch(`${API_URL}/api/event-types/`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setEventTypes(data))
        .catch(console.error)
        .finally(() => setIsLoadingTypes(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title || '',
          date: formatApiDateToInput(initialData.date),
          description: initialData.description || '',
          guest_name: initialData.guest_name || '',
          guest_phone: initialData.guest_phone || '',
          status: initialData.status || 'planned'
        });
        setSelectedTypeId(initialData.event_type?.id || initialData.event_type_id || null);
      } else {
        setFormData({
          title: '',
          date: initialDate ? formatDateForInput(initialDate) : formatDateForInput(new Date()),
          description: '',
          guest_name: '',
          guest_phone: '',
          status: 'planned'
        });
        setSelectedTypeId(null);
      }
    }
  }, [isOpen, initialDate, initialData]);

  const handleTypeSelect = (type: EventType) => {
    setSelectedTypeId(type.id);
    if (!formData.title) setFormData(prev => ({ ...prev, title: type.name }));
  };

  const groupedTypes = eventTypes.reduce((acc, type) => {
    const cat = type.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(type);
    return acc;
  }, {} as Record<string, EventType[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) return addToast({ title: "Error", description: "Выберите тип события", color: "danger", variant: "flat" });

    setIsSubmitting(true);
    const token = localStorage.getItem('access_token');

    const payload: any = {
      event_type_id: selectedTypeId,
      title: formData.title,
      date: formData.date.replace('T', ' '),
      description: formData.description,
      status: formData.status,
      guest_name: formData.guest_name || null,
      guest_phone: formData.guest_phone || null,
      pet: initialData?.pet || null
    };

    try {
      const url = initialData
        ? `${API_URL}/api/events/${initialData.id}/`
        : `${API_URL}/api/events/`;
      const method = initialData ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        console.error(err);
        throw new Error('Ошибка сохранения');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      addToast({ title: "Error", description: "Ошибка сохранения. Проверьте обязательные поля.", color: "danger", variant: "flat" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="flex-row items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:text-left">
          <CalendarClock className="text-primary" size={20} />
          <DialogTitle>
            {initialData ? 'Редактирование записи' : 'Новая запись'}
          </DialogTitle>
        </DialogHeader>

        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-5">
          <form id="calendar-form" onSubmit={handleSubmit} className="space-y-5">
            {(!initialData?.pet) && (
              <div className="space-y-3 rounded-xl border border-accent/30 bg-accent/10 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-accent-foreground">
                  <User size={14} /> Client (Guest)
                </div>

                <Input
                  type="text"
                  required={!initialData}
                  placeholder="Client Name"
                  value={formData.guest_name}
                  onChange={e => setFormData({ ...formData, guest_name: e.target.value })}
                />
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Phone"
                    className="pl-9"
                    value={formData.guest_phone}
                    onChange={e => setFormData({ ...formData, guest_phone: e.target.value })}
                  />
                </div>
              </div>
            )}

            {initialData?.pet && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                <span className="font-bold">Patient:</span> {initialData.pet_info?.name || 'Pet'}
              </div>
            )}

            <div className="space-y-2">
              <Label>Event Type</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-border p-2 custom-scrollbar">
                {Object.entries(groupedTypes).map(([catKey, types]) => {
                  const catConfig = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.other;
                  return (
                    <div key={catKey}>
                      <div className="mb-1 mt-1 px-2 text-[10px] font-bold uppercase text-muted-foreground">{catConfig.label}</div>
                      <div className="grid grid-cols-2 gap-2">
                        {types.map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => handleTypeSelect(type)}
                            className={`truncate rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all ${
                              selectedTypeId === type.id
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-card text-muted-foreground hover:border-input'
                            }`}
                          >
                            {type.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input
                  type="datetime-local"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Title / Reason</Label>
                <Input
                  type="text"
                  required
                  placeholder="Brief description"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Comment</Label>
                <Textarea
                  rows={2}
                  className="resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="border-t border-border bg-muted/40 px-5 py-4 sm:justify-stretch">
          <Button
            form="calendar-form"
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <span className="animate-pulse">Saving...</span> : <><Check size={18} /> Save</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}