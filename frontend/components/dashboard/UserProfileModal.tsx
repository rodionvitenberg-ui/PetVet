'use client';

import React, { useState } from 'react';
import {
  Phone, Mail, MapPin, Stethoscope,
  User, Send, Copy, Check, Briefcase,
  MessageCircle, Instagram, Globe, ArrowUpRight
} from 'lucide-react';
import { UserProfile } from '@/types/pet';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getAvatarUrl = (url?: string) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
};

// Brand-colors for social contacts stay hardcoded for recognizability.
const getContactConfig = (type: string) => {
  switch (type) {
    case 'whatsapp': return { icon: <MessageCircle size={18} />, color: 'text-green-600', bg: 'bg-green-100', label: 'WhatsApp' };
    case 'telegram': return { icon: <Send size={18} />, color: 'text-sky-600', bg: 'bg-sky-100', label: 'Telegram' };
    case 'instagram': return { icon: <Instagram size={18} />, color: 'text-pink-600', bg: 'bg-pink-100', label: 'Instagram' };
    case 'email': return { icon: <Mail size={18} />, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Email' };
    case 'site': return { icon: <Globe size={18} />, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Сайт' };
    case 'vk': return { icon: <span className="text-xs font-bold">VK</span>, color: 'text-blue-700', bg: 'bg-blue-100', label: 'ВКонтакте' };
    case 'phone': default: return { icon: <Phone size={18} />, color: 'text-primary', bg: 'bg-primary/10', label: 'Телефон' };
  }
};

const getContactLink = (type: string, value: string) => {
  const cleanValue = value.replace(/\s+/g, '').replace(/-/g, '').replace('(', '').replace(')', '');
  switch (type) {
    case 'phone': return `tel:${cleanValue}`;
    case 'email': return `mailto:${value}`;
    case 'whatsapp': return `https://wa.me/${cleanValue.startsWith('+') ? cleanValue.substring(1) : cleanValue}`;
    case 'telegram': return `https://t.me/${value.replace('@', '').replace('https://t.me/', '')}`;
    case 'instagram': return `https://instagram.com/${value.replace('@', '').replace('https://instagram.com/', '')}`;
    case 'site': return value.startsWith('http') ? value : `https://${value}`;
    case 'vk': return value.startsWith('http') ? value : `https://vk.com/${value}`;
    default: return null;
  }
};

export default function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isVet = user?.is_veterinarian ?? false;

  return (
    <Dialog open={isOpen && !!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md overflow-hidden p-0" showCloseButton={false}>
        {user && (
          <>
            <div className={cn('relative h-32', isVet ? 'bg-success' : 'bg-primary')}>
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full bg-black/20 p-2 text-white transition hover:bg-black/30 focus-ring"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                <span className="sr-only">Close</span>
              </button>
              <div className="absolute -bottom-12 left-6 rounded-full bg-card p-1">
                <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-muted shadow-sm">
                  {user.avatar ? (
                    <img src={getAvatarUrl(user.avatar)!} alt={user.name} className="size-full object-cover" />
                  ) : isVet ? (
                    <Stethoscope size={40} className="text-success" />
                  ) : (
                    <User size={40} className="text-primary" />
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 pt-14">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold leading-tight text-foreground">{user.name}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide',
                      isVet ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                    )}>
                      {isVet ? 'Vet' : 'Owner'}
                    </span>
                    {user.city && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin size={12} /> {user.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {user.clinic_name && isVet && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-card text-success shadow-sm">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Workplace</p>
                    <p className="text-sm font-bold text-foreground">{user.clinic_name}</p>
                  </div>
                </div>
              )}

              {user.about && (
                <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm leading-relaxed text-foreground">
                  {user.about}
                </div>
              )}

              <div className="mt-6 space-y-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact</h3>

                {(!user.contacts || user.contacts.length === 0) && (
                  <>
                    {user.phone && (
                      <ContactRow
                        icon={<Phone size={18} />}
                        label="Phone"
                        value={user.phone}
                        onCopy={() => copyToClipboard(user.phone!, 'phone')}
                        isCopied={copiedField === 'phone'}
                        link={`tel:${user.phone}`}
                      />
                    )}
                    {user.email && (
                      <ContactRow
                        icon={<Mail size={18} />}
                        label="Email"
                        value={user.email}
                        onCopy={() => copyToClipboard(user.email, 'email')}
                        isCopied={copiedField === 'email'}
                        link={`mailto:${user.email}`}
                      />
                    )}
                  </>
                )}

                {user.contacts?.map((contact) => {
                  const config = getContactConfig(contact.type);
                  const link = getContactLink(contact.type, contact.value);

                  return (
                    <div key={contact.id} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-input">
                      <div className={cn('flex size-9 items-center justify-center rounded-full', config.bg, config.color)}>
                        {config.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">
                          {contact.label || config.label}
                        </p>
                        <p className="truncate text-sm font-bold text-foreground">{contact.value}</p>
                      </div>

                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-2 text-primary hover:bg-muted"
                          >
                            <ArrowUpRight size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => copyToClipboard(contact.value, contact.type)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                        >
                          {copiedField === contact.type ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const ContactRow = ({ icon, label, value, onCopy, isCopied, link }: any) => (
  <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-input">
    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-bold text-foreground">{value}</p>
    </div>
    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      {link && (
        <a href={link} className="rounded-lg p-2 text-primary hover:bg-muted" target="_blank" rel="noopener noreferrer">
          <ArrowUpRight size={16} />
        </a>
      )}
      <button onClick={onCopy} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
        {isCopied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
      </button>
    </div>
  </div>
);