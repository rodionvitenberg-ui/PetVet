// components/modals/CreatePatientModal.tsx
'use client';
import PetFormWizard from '../pet-form/PetFormWizard';

export default function CreatePatientModal({ isOpen, onClose, onSuccess }: any) {
  return (
    <PetFormWizard 
       isOpen={isOpen} 
       onClose={onClose} 
       onSuccess={onSuccess} 
       mode="create_patient" 
    />
  );
}