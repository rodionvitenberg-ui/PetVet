'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileText, Check, Receipt } from 'lucide-react';
import { EventType } from '@/types/event';
import { addToast } from "@heroui/toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import EventInfoTab from '@/components/events/EventInfoTab';
import EventBillingTab from '@/components/events/EventBillingTab';
import { CatalogItem, InvoiceItemDraft, Template, EventFormData } from '@/components/events/types';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  petId: number;
  initialData?: any;
  initialTab?: 'info' | 'billing';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function CreateEventModal({
  isOpen,
  onClose,
  onSuccess,
  petId,
  initialData,
  initialTab = 'info'
}: CreateEventModalProps) {

  const [activeTab, setActiveTab] = useState<'info' | 'billing'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    status: 'completed',
    title: '',
    date: '',
    next_date: '',
    description: ''
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemDraft[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const formatApiDateToInput = (isoString?: string) => {
    if (!isoString) return '';
    return isoString.replace(' ', 'T').slice(0, 16);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);

      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      setIsLoadingTypes(true);
      Promise.all([
        fetch(`${API_URL}/api/event-types/`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/billing/templates/`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/billing/catalog/`, { headers }).then(r => r.json())
      ])
        .then(([typesData, templatesData, catalogData]) => {
          setEventTypes(typesData);
          setTemplates(templatesData);
          setCatalog(catalogData);
        })
        .catch(console.error)
        .finally(() => setIsLoadingTypes(false));

      if (initialData) {
        setFormData({
          status: initialData.status || 'completed',
          title: initialData.title || '',
          date: formatApiDateToInput(initialData.date),
          next_date: formatApiDateToInput(initialData.next_date),
          description: initialData.description || ''
        });
        setSelectedTypeId(initialData.event_type?.id);
      } else {
        setFormData({
          status: 'completed',
          title: '',
          date: getCurrentDateTime(),
          next_date: '',
          description: ''
        });
        setSelectedTypeId(null);
        setInvoiceItems([]);
      }
      setFiles([]);
    }
  }, [isOpen, initialData, initialTab]);

  const applyTemplate = (templateId: string) => {
    const tmpl = templates.find(t => t.id === Number(templateId));
    if (!tmpl) return;

    setFormData(prev => ({
      ...prev,
      description: prev.description ? prev.description + '\n' + tmpl.description_template : tmpl.description_template
    }));

    const newItems = tmpl.items.map(i => ({
      item_id: i.item_id,
      name: i.item_name,
      price: Number(i.item_price),
      quantity: i.quantity
    }));

    setInvoiceItems(prev => [...prev, ...newItems]);
    addToast({ title: "Template applied", description: `"${tmpl.name}": description added and ${newItems.length} items added to invoice.`, color: "success", variant: "flat" });
  };

  const addInvoiceItem = (catalogItemId: string) => {
    const item = catalog.find(c => c.id === Number(catalogItemId));
    if (!item) return;

    setInvoiceItems(prev => [
      ...prev,
      { item_id: item.id, name: item.name, price: Number(item.price), quantity: 1 }
    ]);
  };

  const updateItemQuantity = (index: number, delta: number) => {
    setInvoiceItems(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTypeId) {
      addToast({
        title: "Event type not selected",
        description: "Please select a type from the list",
        color: "danger",
        variant: "flat"
      });
      return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem('access_token');

    try {
      const eventPayload = new FormData();
      if (!initialData) eventPayload.append('pet', petId.toString());
      eventPayload.append('event_type_id', selectedTypeId.toString());

      let calculatedStatus = formData.status;
      if (!initialData) {
        const eventDate = new Date(formData.date);
        const now = new Date();
        calculatedStatus = eventDate > now ? 'planned' : 'completed';
      }
      eventPayload.append('status', calculatedStatus);

      eventPayload.append('title', formData.title);
      eventPayload.append('date', formData.date.replace('T', ' '));
      eventPayload.append('description', formData.description);
      if (formData.next_date) eventPayload.append('next_date', formData.next_date.replace('T', ' '));

      files.forEach(f => eventPayload.append('attachments', f));

      const eventUrl = initialData
        ? `${API_URL}/api/events/${initialData.id}/`
        : `${API_URL}/api/events/`;

      const eventRes = await fetch(eventUrl, {
        method: initialData ? 'PATCH' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: eventPayload
      });

      if (!eventRes.ok) {
        const errData = await eventRes.json();
        throw new Error(typeof errData === 'object' ? JSON.stringify(errData) : 'Error saving event');
      }

      const eventData = await eventRes.json();
      let invoiceCreated = false;

      if (invoiceItems.length > 0 && !initialData) {
        const invoicePayload = {
          pet: petId,
          event: eventData.id,
          status: 'unpaid',
          items: invoiceItems.map(i => ({
            item_id: i.item_id,
            quantity: i.quantity
          }))
        };

        const invoiceRes = await fetch(`${API_URL}/api/billing/invoices/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invoicePayload)
        });

        if (!invoiceRes.ok) {
          console.error("Error creating invoice", await invoiceRes.json());
          addToast({ title: "Warning", description: "Event created, but there was an error creating the invoice", color: "warning", variant: "flat" });
        } else {
          invoiceCreated = true;
        }
      }

      const action = initialData ? "updated" : "created";
      const extraInfo = invoiceCreated ? ". Invoice generated." : "";

      addToast({
        title: `Event ${action}`,
        description: `Record saved successfully${extraInfo}`,
        color: "success",
        variant: "flat"
      });

      onSuccess();
      onClose();

    } catch (error: any) {
      console.error(error);
      let errorMsg = "An error occurred while saving";
      try {
        errorMsg = error.message.includes('{') ? "Validation error" : error.message;
      } catch {}

      addToast({
        title: "Error",
        description: errorMsg,
        color: "danger",
        variant: "flat"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border bg-muted/40">
          <div className="flex items-center justify-between px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              {activeTab === 'info'
                ? <FileText className="text-primary" />
                : <Receipt className="text-success" />}
              {initialData ? 'Editing' : 'New Event'}
            </DialogTitle>
          </div>

          <div className="flex gap-6 px-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`border-b-2 pb-3 text-sm font-bold transition ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Main
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition ${activeTab === 'billing' ? 'border-success text-success' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Invoice and Items
              {invoiceItems.length > 0 && (
                <span className="rounded-md bg-success/10 px-1.5 text-[10px] text-success">{invoiceItems.length}</span>
              )}
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-card p-6 custom-scrollbar">
          <form id="event-form" onSubmit={handleSubmit}>
            {activeTab === 'info' && (
              <EventInfoTab
                eventTypes={eventTypes}
                templates={templates}
                formData={formData}
                files={files}
                selectedTypeId={selectedTypeId}
                isNew={!initialData}
                fileInputRef={fileInputRef}
                onSelectType={setSelectedTypeId}
                onFormChange={setFormData}
                onApplyTemplate={applyTemplate}
                onFilesChange={setFiles}
              />
            )}

            {activeTab === 'billing' && (
              <EventBillingTab
                catalog={catalog}
                items={invoiceItems}
                onAddItem={addInvoiceItem}
                onUpdateQuantity={updateItemQuantity}
                onRemoveItem={removeInvoiceItem}
              />
            )}
          </form>
        </div>

        <DialogFooter className="border-t border-border bg-muted/40 p-5">
          {activeTab === 'billing' && (
            <Button variant="ghost" onClick={() => setActiveTab('info')}>
              Back
            </Button>
          )}
          <Button
            form="event-form"
            type="submit"
            disabled={isSubmitting || isLoadingTypes}
            className="gap-2"
          >
            {isSubmitting ? 'Saving...' : (
              <>
                <Check />
                {invoiceItems.length > 0 ? 'Save and Issue Invoice' : 'Save'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}