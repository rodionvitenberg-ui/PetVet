'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, Mail, MessageCircle, Send, Instagram, Globe, User, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { addToast } from "@heroui/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type ContactType = 'phone' | 'whatsapp' | 'telegram' | 'instagram' | 'email' | 'site' | 'vk' | 'other';

interface UserContact {
  id: number;
  type: ContactType;
  type_display: string;
  value: string;
  label?: string;
}

const CONTACT_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  whatsapp: { icon: <MessageCircle size={16} />, label: 'WhatsApp', color: 'text-success bg-success/10 border-green-200' },
  telegram: { icon: <Send size={16} />, label: 'Telegram', color: 'text-primary bg-primary/10 border-primary/20' },
  instagram: { icon: <Instagram size={16} />, label: 'Instagram', color: 'text-accent-foreground bg-accent/15 border-pink-200' },
  email: { icon: <Mail size={16} />, label: 'Email', color: 'text-muted-foreground bg-muted border-border' },
  site: { icon: <Globe size={16} />, label: 'Site', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  vk: { icon: <span className="font-bold text-xs">VK</span>, label: 'VK', color: 'text-primary bg-primary/10 border-primary/20' },
  phone: { icon: <Phone size={16} />, label: 'Phone', color: 'text-primary bg-primary/10 border-primary/20' },
  other: { icon: <User size={16} />, label: 'Other', color: 'text-muted-foreground bg-muted border-border' },
};

export default function ContactsSection() {
  const { user } = useAuth();

  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [newContact, setNewContact] = useState<{ type: ContactType; value: string; label: string }>({
    type: 'phone',
    value: '',
    label: ''
  });
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/auth/contacts/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (e) {
      console.error("Failed to load contacts", e);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleAddContact = async () => {
    if (!newContact.value) return;
    setIsAddingContact(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/auth/contacts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newContact)
      });

      if (res.ok) {
        await fetchContacts();
        setNewContact({ type: 'phone', value: '', label: '' });
        addToast({ title: "Contact added", color: "success", variant: "flat" });
      } else {
        throw new Error();
      }
    } catch {
      addToast({ title: "Error adding contact", color: "danger", variant: "flat" });
    } finally {
      setIsAddingContact(false);
    }
  };

  const performDeleteContact = async (id: number) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/auth/contacts/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setContacts(prev => prev.filter(c => c.id !== id));
      addToast({ title: "Contact deleted", color: "default", variant: "flat" });
    } catch {
      addToast({ title: "Failed to delete contact", color: "danger", variant: "flat" });
    }
  };

  const handleDeleteContactClick = (id: number) => {
    if (deleteConfirmId === id) {
      performDeleteContact(id);
      setDeleteConfirmId(null);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    } else {
      setDeleteConfirmId(id);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Phone size={20} className="text-primary" /> Contacts
      </h3>
      <p className="text-sm text-muted-foreground mb-6">Add contact methods so that {user.is_veterinarian ? 'owners' : 'veterinarians'} can reach you.</p>

      <div className="space-y-3 mb-6">
        {contactsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm">
            No additional contacts
          </div>
        ) : (
          contacts.map(c => {
            const config = CONTACT_CONFIG[c.type] || CONTACT_CONFIG['other'];
            const isConfirming = deleteConfirmId === c.id;

            return (
              <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${config.color} bg-opacity-30`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-card shadow-sm">
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold opacity-70 uppercase tracking-wide">{c.label || config.label}</p>
                    <p className="font-medium text-foreground text-sm">{c.value}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteContactClick(c.id)}
                  className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                    isConfirming
                      ? 'bg-destructive/100 text-white shadow-md px-3'
                      : 'text-muted-foreground hover:text-destructive hover:bg-card'
                  }`}
                >
                  {isConfirming ? (
                    <>
                      <span className="text-xs font-bold">Удалить?</span>
                      <Trash2 size={16} />
                    </>
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-muted/50 p-4 rounded-xl border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <select
            className="p-2.5 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20"
            value={newContact.type}
            onChange={e => setNewContact({ ...newContact, type: e.target.value as ContactType })}
          >
            {Object.entries(CONTACT_CONFIG).map(([key, conf]) => (
              <option key={key} value={key}>{conf.label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Number or username"
            className="p-2.5 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20 text-sm sm:col-span-2"
            value={newContact.value}
            onChange={e => setNewContact({ ...newContact, value: e.target.value })}
          />
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Label (e.g., Work)"
            className="flex-1 p-2.5 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            value={newContact.label}
            onChange={e => setNewContact({ ...newContact, label: e.target.value })}
          />
          <button
            onClick={handleAddContact}
            disabled={!newContact.value || isAddingContact}
            className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-black transition flex items-center gap-2 disabled:opacity-50"
          >
            {isAddingContact ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add Contact
          </button>
        </div>
      </div>
    </div>
  );
}