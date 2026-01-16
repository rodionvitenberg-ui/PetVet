'use client';

import React from 'react';
import { usePetForm } from '@/hooks/usePetForm';
import { ArrowLeft, X } from 'lucide-react';
import { StepBasicInfo, StepDetails, StepPhotos } from '../pet-form/PetFormSteps';
// [FIX] Убедитесь, что импорт правильный
import { PetDetail } from '@/types/pet';

interface EditPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // [FIX] Явно разрешаем null, чтобы TS не ругался
  pet: PetDetail | null;
}

export default function EditPetModal({ isOpen, onClose, onSuccess, pet }: EditPetModalProps) {
  
  const {
    step, formData, dictionaries, files, previewUrls, isLoading, isSubmitting, error,
    updateField, handleCategorySelect, toggleTag, setAttributeValue, handleFileChange, removeFile,
    nextStep, prevStep, submit,
    createCustomTag, createCustomAttribute
  } = usePetForm({ 
      mode: 'edit', 
      initialData: pet, 
      onSuccess: () => {
          onSuccess();
          onClose();
      } 
  });

  if (!isOpen || !pet) return null;

  const finalStepIndex = 3;
  const handleFieldChange = (field: string, value: any) => updateField(field as any, value);

  const renderContent = () => {
    if (step === 1) return <StepBasicInfo data={formData} onChange={handleFieldChange} categories={dictionaries.categories} onCategorySelect={handleCategorySelect} mode="edit" />;
    if (step === 2) return <StepDetails data={formData} attributes={dictionaries.attributes} tags={dictionaries.tags} onAttributeChange={setAttributeValue} onTagToggle={toggleTag} onChange={handleFieldChange} onCreateTag={createCustomTag} onCreateAttribute={createCustomAttribute} />;
    if (step === 3) return <StepPhotos files={files} previewUrls={previewUrls} onFileChange={handleFileChange} onRemove={removeFile} />;
    return null;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
           <div className="flex items-center gap-3">
              {step > 1 && <button onClick={prevStep} className="p-1.5 hover:bg-white rounded-full transition text-gray-500"><ArrowLeft size={20} /></button>}
              <h2 className="text-xl font-bold text-gray-800">Редактирование</h2>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500"><X size={20} /></button>
        </div>
        <div className="h-1 bg-gray-100 w-full flex">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(step / finalStepIndex) * 100}%` }}/>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {isLoading ? <div className="text-center py-10 text-gray-400">Загрузка...</div> : renderContent()}
        </div>
        {error && <div className="px-6 pb-2 text-red-500 text-sm animate-pulse text-center font-medium">{error}</div>}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button onClick={step === finalStepIndex ? submit : nextStep} disabled={isSubmitting || isLoading} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-lg shadow-blue-200 flex justify-center items-center gap-2">
               {isSubmitting && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
               {step === finalStepIndex ? 'Сохранить' : 'Далее'}
            </button>
        </div>
      </div>
    </div>
  );
}