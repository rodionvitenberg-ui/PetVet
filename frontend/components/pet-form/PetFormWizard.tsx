'use client';
import React, { useEffect, useRef } from 'react';
import { usePetForm, PetFormMode } from '@/hooks/usePetForm';
import { PetDetail } from '@/types/pet';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { StepBasicInfo, StepDetails, StepPhotos } from './PetFormSteps';

interface PetFormWizardProps {
  mode: PetFormMode;
  initialData?: PetDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data?: any) => void;
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
  
  const handleSuccess = (data?: any) => {
      if (onSuccess) onSuccess(data); 
      onClose();   
  };

  const {
    step, formData, dictionaries, files, previewUrls, isLoading, isSubmitting, error,
    updateField, handleCategorySelect, toggleTag, setAttributeValue, handleFileChange, removeFile,
    nextStep, prevStep, submit,
    createCustomTag, createCustomAttribute, reset 
  } = usePetForm({ mode, initialData, onSuccess: handleSuccess });

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && mode !== 'edit') {
        reset();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (contentRef.current) {
        contentRef.current.scrollTop = 0;
    }
  }, [step]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (step) {
        case 1:
            return (
                <StepBasicInfo 
                    // [FIX] Передаем data вместо formData
                    data={formData} 
                    // [FIX] Разворачиваем categories из словаря
                    categories={dictionaries.categories}
                    // [FIX] Явная типизация для TS
                    onChange={(field: any, value: any) => updateField(field, value)}
                    onCategorySelect={handleCategorySelect}
                    mode={mode}
                />
            );
        case 2:
            return (
                <StepDetails 
                    // [FIX] Передаем data вместо formData
                    data={formData}
                    // [FIX] Передаем конкретные списки
                    attributes={dictionaries.attributes}
                    tags={dictionaries.tags}
                    
                    // [FIX] Явная типизация: field это string, кастим к keyof formData
                    onChange={(field: string, value: any) => updateField(field as any, value)}
                    
                    onAttributeChange={setAttributeValue}
                    onCreateAttribute={createCustomAttribute}
                    
                    // [FIX] Добавили недостающие пропсы
                    onTagToggle={toggleTag}
                    onCreateTag={createCustomTag}
                />
            );
        case 3:
            return (
                <StepPhotos 
                    files={files}
                    previewUrls={previewUrls}
                    onFileChange={handleFileChange}
                    onRemove={removeFile} // [FIX] Исправили имя пропа (было onRemoveFile)
                />
            );
        default:
            return null;
    }
  };

  const handleFooterAction = () => {
      if (step === 3) {
          submit();
      } else {
          nextStep();
      }
  };

  const getTitle = () => {
      if (mode === 'edit') return 'Редактирование питомца';
      if (mode === 'create_patient') return 'Новый пациент';
      return 'Добавить питомца';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
           <div className="flex items-center gap-3">
               {step > 1 && (
                   <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition">
                       <ArrowLeft size={20}/>
                   </button>
               )}
               <div>
                   <h2 className="text-xl font-bold text-gray-900">{getTitle()}</h2>
                   <div className="flex gap-1 mt-1">
                       {[1, 2, 3].map(s => (
                           <div key={s} className={`h-1.5 w-8 rounded-full transition-colors ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                       ))}
                   </div>
               </div>
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
                {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {step === 3 ? (mode === 'edit' ? 'Сохранить изменения' : 'Создать карточку') : 'Далее'}
            </button>
        </div>

      </div>
    </div>
  );
}