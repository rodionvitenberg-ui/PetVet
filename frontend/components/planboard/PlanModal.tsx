'use client';

import React, { useState, useEffect } from 'react';
import { CalendarClock, Check } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

export default function PlanModal({ isOpen, onClose, onConfirm }: PlanModalProps) {
  const [dateValue, setDateValue] = useState('');
  const [activeButton, setActiveButton] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
      setDateValue(tomorrow.toISOString().slice(0, 16));
      setActiveButton(1);
    }
  }, [isOpen]);

  const handleQuickSet = (daysToAdd: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    date.setHours(9, 0, 0, 0);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    setDateValue(date.toISOString().slice(0, 16));
    setActiveButton(daysToAdd);
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
    'bg-card border-input text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary';
  const activeClass =
    'bg-primary border-primary text-primary-foreground shadow-md ring-2 ring-primary/20 ring-offset-1 scale-105';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="flex-row items-center gap-2 border-b border-border bg-muted px-4 py-3 sm:text-left">
          <CalendarClock className="text-primary" size={20} />
          <DialogTitle>Перенос в планы</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="text-center text-sm leading-relaxed text-muted-foreground">
            You are rescheduling the task to{' '}
            <span className="rounded bg-primary/10 px-2 py-0.5 font-bold text-primary">
              PLANS
            </span>
            <br />
            What date?
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
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickSet(2)}
              className={`${baseBtnClass} ${activeButton === 2 ? activeClass : inactiveClass}`}
            >
              The day after tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleQuickSet(7)}
              className={`${baseBtnClass} ${activeButton === 7 ? activeClass : inactiveClass}`}
            >
              In a week
            </button>
          </div>

          <Button type="submit" className="w-full" size="lg">
            <Check /> Reschedule
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}