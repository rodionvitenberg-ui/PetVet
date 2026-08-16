'use client';

import React from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeletePetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  petName: string;
  isDeleting: boolean;
}

export default function DeletePetModal({
  isOpen,
  onClose,
  onConfirm,
  petName,
  isDeleting,
}: DeletePetModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle size={32} strokeWidth={2.5} />
          </div>
          <DialogTitle>Delete Pet?</DialogTitle>
          <DialogDescription>
            You are about to delete the profile of{' '}
            <span className="font-semibold text-foreground">“{petName}”</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center text-xs font-medium leading-relaxed text-destructive">
          This action cannot be undone. All data: medical history, photos and
          events will be deleted permanently.
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}