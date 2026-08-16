'use client';

import React, { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import { createClinic } from '@/services/clinicService';
import { addToast } from "@heroui/toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex-row items-center gap-2 sm:text-left">
          <div className="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success">
            <Building2 size={20} />
          </div>
          <DialogTitle>Create Clinic</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clinic-name">Clinic Name *</Label>
            <Input
              id="clinic-name"
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Happy Paws Clinic"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clinic-address">Address</Label>
            <Input
              id="clinic-address"
              type="text"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="clinic-phone">Phone</Label>
              <Input
                id="clinic-phone"
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clinic-email">Email</Label>
              <Input
                id="clinic-email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clinic-description">Description</Label>
            <Textarea
              id="clinic-description"
              rows={3}
              className="resize-none"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of your clinic..."
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full bg-success text-success-foreground hover:bg-success/90"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Building2 />}
            Create Clinic
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}