'use client';
import React, { useEffect, useRef } from 'react';
import { usePetForm, PetFormMode } from '@/hooks/usePetForm';
import { PetDetail } from '@/types/pet';
import { ArrowLeft, X, Loader2 } from 'lucide-react';
import { StepBasicInfo, StepDetails, StepPhotos } from './PetFormSteps';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
                    data={formData} 
                    categories={dictionaries.categories}
                    onChange={updateField}
                    onCategorySelect={handleCategorySelect}
                    mode={mode}
                />
            );
        case 2:
            return (
                <StepDetails 
                    data={formData}
                    attributes={dictionaries.attributes}
                    tags={dictionaries.tags}
                    onChange={updateField}
                    onAttributeChange={setAttributeValue}
                    onCreateAttribute={createCustomAttribute}
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
                    onRemove={removeFile}
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
      if (mode === 'edit') return 'Editing Pet';
      if (mode === 'create_patient') return 'New Patient';
      return 'Add Pet';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-[var(--radius-xl)] p-0"
      >
        
        {/* HEADER */}
        <div className="z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
           <div className="flex items-center gap-3">
                {step > 1 && (
                    <button onClick={prevStep} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted">
                        <ArrowLeft size={20}/>
                    </button>
                )}
                <div>
                    <h2 className="text-xl font-bold text-foreground">{getTitle()}</h2>
                    <div className="mt-1 flex gap-1">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`h-1.5 w-8 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
                        ))}
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"><X size={20}/></button>
         </div>

        {/* CONTENT */}
        <div ref={contentRef} className="flex-1 overflow-y-auto custom-scrollbar p-6">
           {isLoading ? (
               <div className="flex flex-col items-center justify-center h-40 space-y-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"/>
                    <span className="text-sm text-muted-foreground">Loading data...</span>
               </div>
           ) : renderContent()}
        </div>
        
        {/* ERROR */}
        {error && <div className="px-6 pb-2 text-center text-sm font-medium text-destructive animate-pulse">{error}</div>}

        {/* FOOTER */}
        <div className="border-t border-border bg-muted/40 p-6">
            <Button
                onClick={handleFooterAction}
                disabled={isSubmitting || isLoading}
                className="w-full"
                size="lg"
            >
                {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                {step === 3 ? (mode === 'edit' ? 'Save Changes' : 'Create Card') : 'Next'}
            </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
