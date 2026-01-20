'use client';
import { addToast } from "@heroui/toast";
import PetFormWizard from '../pet-form/PetFormWizard';

export default function CreatePatientModal({ isOpen, onClose, onSuccess }: any) {
  
  // Обёртка над успешным завершением
  const handleSuccess = (data: any) => {
    addToast({
      title: "Пациент создан",
      description: `Карточка ${data?.name || 'пациента'} успешно заведена`,
      color: "success",
      variant: "flat"
    });
    
    // Вызываем оригинальный onSuccess (чтобы обновить список)
    if (onSuccess) onSuccess(data);
  };

  return (
    <PetFormWizard 
       isOpen={isOpen} 
       onClose={onClose} 
       onSuccess={handleSuccess} // <-- Передаем нашу обёртку
       mode="create_patient" 
    />
  );
}