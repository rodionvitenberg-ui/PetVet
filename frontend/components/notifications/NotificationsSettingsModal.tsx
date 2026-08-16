'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell, Volume2, Smartphone, Monitor, Mail,
  Activity, Heart, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface Settings {
  email_enabled: boolean;
  push_enabled: boolean;
  browser_enabled: boolean;
  sound_enabled: boolean;
  notify_medical: boolean;
  notify_care: boolean;
  notify_reproduction: boolean;
  notify_system: boolean;
  reminder_time_minutes: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSettingsModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      fetchSettings();
    }
  }, [isOpen, user]);

  const fetchSettings = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_URL}/api/notification-settings/me/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSettings(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateSetting = async (key: keyof Settings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    const token = localStorage.getItem('access_token');
    try {
      await fetch(`${API_URL}/api/notification-settings/me/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [key]: value })
      });
    } catch (e) {
      console.error('Failed to save setting');
      fetchSettings();
    }
  };

  type BooleanField = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

  const Toggle = ({ label, icon: Icon, field }: { label: string; icon: any; field: BooleanField }) => (
    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex size-9 items-center justify-center rounded-lg',
          settings?.[field] ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          <Icon size={18} />
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {settings && (
        <Switch
          checked={settings[field]}
          onCheckedChange={(v) => updateSetting(field, v)}
        />
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="flex-row items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:text-left">
          <Bell className="text-primary" size={20} />
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-4">
          {!settings && loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <section>
                <h4 className="mb-3 text-xs font-bold uppercase text-muted-foreground">Where to notify?</h4>
                <div className="space-y-2">
                  <Toggle label="Browser (Pop-ups)" icon={Monitor} field="browser_enabled" />
                  <Toggle label="Mobile Push" icon={Smartphone} field="push_enabled" />
                  <Toggle label="Email" icon={Mail} field="email_enabled" />
                  <Toggle label="Sound" icon={Volume2} field="sound_enabled" />
                </div>
              </section>

              <section>
                <h4 className="mb-3 text-xs font-bold uppercase text-muted-foreground">What to notify about?</h4>
                <div className="space-y-2">
                  <Toggle label="Health and Procedures" icon={Activity} field="notify_medical" />
                  <Toggle label="Grooming" icon={ShieldCheck} field="notify_care" />
                  <Toggle label="Reproduction" icon={Heart} field="notify_reproduction" />
                </div>
              </section>

              <section>
                <h4 className="mb-3 text-xs font-bold uppercase text-muted-foreground">When to remind?</h4>
                <select
                  value={settings?.reminder_time_minutes}
                  onChange={(e) => updateSetting('reminder_time_minutes', Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-card p-3 text-sm font-semibold outline-none transition focus-ring"
                >
                  <option value={15}>15 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                  <option value={4320}>3 days before</option>
                  <option value={10080}>7 days before</option>
                </select>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  For recurring events like vaccinations, you'll receive reminders by email and in-app at the selected time.
                </p>
              </section>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-muted/40 px-6 py-4 sm:justify-stretch">
          <Button className="w-full" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}