'use client';

import React from 'react';
import { PetDetail } from '@/types/pet';
import { addToast } from "@heroui/toast";
import PetFormWizard from '../pet-form/PetFormWizard';

interface EditPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pet: PetDetail | null;
}

export default function EditPetModal({ isOpen, onClose, onSuccess, pet }: EditPetModalProps) {
  return (
    <PetFormWizard
      mode="edit"
      initialData={pet}
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={() => {
        addToast({
          title: "Saved",
          description: `Pet data for "${pet?.name}" updated`,
          color: "success",
          variant: "flat"
        });
        onSuccess();
      }}
    />
  );
}