'use client';

import React, { useState } from 'react';
import { CalendarClock, Check } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

export default function TimeModal({ isOpen, onClose, onConfirm }: TimeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <TimeModalContent onClose={onClose} onConfirm={onConfirm} />
    </Dialog>
  );
}

function getDefaultNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function TimeModalContent({
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (date: Date) => void;
}) {
  const [dateValue, setDateValue] = useState(getDefaultNow);
  const [activeButton, setActiveButton] = useState<string | number | null>(null);

  const handleQuickSet = (hoursToAdd: number) => {
    const date = new Date();
    date.setHours(date.getHours() + hoursToAdd);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    setDateValue(date.toISOString().slice(0, 16));
    setActiveButton(hoursToAdd);
  };

  const handleMorningSet = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    setDateValue(date.toISOString().slice(0, 16));
    setActiveButton('morning');
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateValue(e.target.value);
    setActiveButton(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(new Date(dateValue));
  };

  const baseBtnClass =
    'px-3 py-2.5 border rounded-xl text-xs font-semibold transition-[color,background-color,border-color,transform] shadow-sm active:scale-[0.96] flex items-center justify-center';
  const inactiveClass =
    'bg-card border-input text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive';
  const activeClass =
    'bg-destructive border-destructive text-destructive-foreground shadow-md ring-2 ring-destructive/20 ring-offset-1';

  return (
    <DialogContent className="max-w-sm p-0">
      <DialogHeader className="flex-row items-center gap-2 border-b border-border bg-muted px-4 py-3 sm:text-left">
        <CalendarClock className="text-destructive" size={20} />
        <DialogTitle>Specify time</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div className="text-center text-sm leading-relaxed text-muted-foreground">
          You are rescheduling the task to{' '}
          <span className="rounded bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
            URGENT
          </span>
          <br />
          When should it be completed?
        </div>

        <input
          type="datetime-local"
          required
          value={dateValue}
          onChange={handleManualChange}
          className="w-full rounded-xl border border-input bg-background p-3 text-center font-mono text-lg text-foreground transition outline-none focus-ring"
        />

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleQuickSet(1)}
            className={`${baseBtnClass} ${activeButton === 1 ? activeClass : inactiveClass}`}
          >
            +1 Hour
          </button>
          <button
            type="button"
            onClick={() => handleQuickSet(3)}
            className={`${baseBtnClass} ${activeButton === 3 ? activeClass : inactiveClass}`}
          >
            +3 Hours
          </button>
          <button
            type="button"
            onClick={handleMorningSet}
            className={`${baseBtnClass} ${activeButton === 'morning' ? activeClass : inactiveClass}`}
          >
            Tomorrow 9:00
          </button>
        </div>

        <Button type="submit" variant="destructive" className="w-full" size="lg">
          <Check /> Confirm
        </Button>
      </form>
    </DialogContent>
  );
}