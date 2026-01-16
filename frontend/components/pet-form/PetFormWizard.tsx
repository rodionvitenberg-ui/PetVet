'use client';
import React, { useEffect, useRef } from 'react';
import { usePetForm, PetFormMode } from '@/hooks/usePetForm';
import { PetDetail } from '@/types/pet';
import { ArrowLeft, X } from 'lucide-react';
import { StepBasicInfo, StepDetails, StepPhotos } from './PetFormSteps';

interface PetFormWizardProps {
  mode: PetFormMode;
  initialData?: PetDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isBreederMode?: boolean; 
}

export default function PetFormWizard({ 
  mode, 
  initialData, 
  isOpen, 
  onClose, 
  onSuccess, 
  isBreederMode = false 
}: PetFormWizardProps) {
  
  // [FIX] Теперь закрываем окно всегда, даже для create_patient
  const handleSuccess = () => {
      onSuccess(); // Обновление списка
      onClose();   // Закрытие модалки
  };

  const {
    step, formData, dictionaries, files, previewUrls, isLoading, isSubmitting, error,
    updateField, handleCategorySelect, toggleTag, setAttributeValue, handleFileChange, removeFile,
    nextStep, prevStep, submit,
    createCustomTag, createCustomAttribute, reset 
  } = usePetForm({ mode, initialData, onSuccess: handleSuccess });

  const contentRef = useRef<HTMLDivElement>(null);

  // Сброс формы при открытии
  useEffect(() => {
    if (isOpen && mode !== 'edit') {
        reset();
    }
  }, [isOpen, mode]);

  // Скролл наверх
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  if (!isOpen) return null;

  // === ЛОГИКА ШАГОВ ===
  const finalStepIndex = 3;

  const handleFieldChange = (field: string, value: any) => {
    updateField(field as any, value); 
  };

  const handleFooterAction = () => {
    if (step === finalStepIndex) {
      submit();
    } else {
      nextStep();
    }
  };

  // === РЕНДЕРИНГ КОНТЕНТА ===
  const renderContent = () => {
    if (step === 1) {
       return <StepBasicInfo data={formData} onChange={handleFieldChange} categories={dictionaries.categories} onCategorySelect={handleCategorySelect} mode={mode} />;
    }

    if (step === 2) {
        return (
            <StepDetails 
               data={formData} 
               attributes={dictionaries.attributes} 
               tags={dictionaries.tags}
               onAttributeChange={setAttributeValue}
               onTagToggle={toggleTag}
               onChange={handleFieldChange}
               onCreateTag={createCustomTag}
               onCreateAttribute={createCustomAttribute}
            />
        );
    }
    
    if (step === 3) {
        return <StepPhotos files={files} previewUrls={previewUrls} onFileChange={handleFileChange} onRemove={removeFile} />;
    }
    
    return null;
  };

  // Заголовок
  const getTitle = () => {
      if (mode === 'edit') return 'Редактирование';
      if (step === 1) return 'Новый питомец';
      if (step === 3) return 'Фотографии';
      return 'Детали и Особенности';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
           <div className="flex items-center gap-2">
              {step > 1 && (
                  <button onClick={prevStep} className="p-1 hover:bg-gray-100 rounded-full text-gray-600 transition"><ArrowLeft size={20}/></button>
              )}
              <h2 className="text-xl font-bold text-gray-800">{getTitle()}</h2>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition"><X size={20}/></button>
        </div>

        {/* CONTENT */}
        <div ref={contentRef} className="flex-1 overflow-y-auto custom-scrollbar p-6">
           {isLoading ? (
               <div className="flex flex-col items-center justify-center h-40 space-y-3">
                   <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                   <span className="text-gray-400 text-sm">Загрузка данных...</span>
               </div>
           ) : renderContent()}
        </div>
        
        {/* ERROR */}
        {error && <div className="px-6 pb-2 text-red-500 text-sm text-center animate-pulse font-medium">{error}</div>}

        {/* FOOTER */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button 
                onClick={handleFooterAction} 
                disabled={isSubmitting || isLoading}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-blue-200"
            >
                {isSubmitting && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                {step === finalStepIndex ? 'Сохранить' : 'Далее'}
            </button>
        </div>

      </div>
    </div>
  );
}