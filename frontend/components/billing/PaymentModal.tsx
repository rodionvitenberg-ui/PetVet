'use client';

import React from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  invoiceId: number | null;
  amount: string;
  isSubmitting: boolean;
}

export default function PaymentModal({ isOpen, onClose, onConfirm, invoiceId, amount, isSubmitting }: PaymentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
            <CreditCard size={32} />
          </div>
          <DialogTitle>Payment Confirmation</DialogTitle>
          <DialogDescription>
            You want to mark the invoice{' '}
            <span className="font-semibold text-foreground">#{invoiceId}</span> for the amount{' '}
            <span className="font-semibold text-foreground">{amount} €</span> as paid?
            <br />
            <br />
            This action will update the clinic's financial statistics.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            className="flex-1 bg-success text-success-foreground hover:bg-success/90"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Processing...'
            ) : (
              <>
                <CheckCircle2 /> Paid
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}