'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';
import { usePetForm } from '@/hooks/usePetForm'; //
import { StepBasicInfo, StepDetails, StepPhotos } from '@/components/pet-form/PetFormSteps'; //

export default function MobileCreatePetPage() {
  const router = useRouter();

  // Инициализируем хук в режиме создания своего питомца
  const {
    step, formData, dictionaries, files, previewUrls, isLoading, isSubmitting, error,
    updateField, handleCategorySelect, toggleTag, setAttributeValue, handleFileChange, removeFile,
    nextStep, prevStep, submit,
    createCustomTag, createCustomAttribute
  } = usePetForm({ 
      mode: 'create_own', 
      onSuccess: () => {
          // На мобилке после успеха просто уходим на дашборд
          router.push('/dashboard');
          router.refresh();
      } 
  });

  // Хендлеры для связки UI и Хука
  const handleFieldChange = (field: string, value: any) => {
    updateField(field as any, value); 
  };

  // Кастомная навигация для мобилки
  const handleNext = () => {
      if (step === 3) submit();
      else nextStep();
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-23 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        
        {/* ХЕДЕР */}
        <div className="flex items-center gap-4 mb-6">
            <button 
                onClick={() => step === 1 ? router.back() : prevStep()}
                className="p-2 bg-white hover:bg-gray-100 rounded-full transition text-gray-600 shadow-sm border border-gray-200"
            >
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {step === 1 ? 'Новый питомец' : 
                     step === 2 ? 'Детали' : 'Фотографии'}
                </h1>
                {/* Индикатор прогресса */}
                <div className="flex gap-2 mt-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === step ? 'bg-blue-600 w-12' : i < step ? 'bg-blue-200 w-8' : 'bg-gray-200 w-8'
                        }`} />
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-6 sm:p-8 min-h-[50vh] flex flex-col">
            
            {/* ОТОБРАЖЕНИЕ ШАГОВ (Используем общие компоненты!) */}
            <div className="flex-1">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-gray-400">Загрузка...</div>
                ) : (
                    <>
                        {step === 1 && (
                            <StepBasicInfo 
                                data={formData} 
                                onChange={handleFieldChange} 
                                categories={dictionaries.categories} 
                                onCategorySelect={handleCategorySelect} 
                                mode="create_own" 
                            />
                        )}
                        {step === 2 && (
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
                        )}
                        {step === 3 && (
                            <StepPhotos 
                                files={files} 
                                previewUrls={previewUrls} 
                                onFileChange={handleFileChange} 
                                onRemove={removeFile} 
                            />
                        )}
                    </>
                )}
            </div>

            {/* ОШИБКИ */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    {error}
                </div>
            )}

            {/* ФУТЕР */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                <button 
                    onClick={handleNext} 
                    disabled={isSubmitting || isLoading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Создаем...' : step < 3 ? (
                        <>Далее <ChevronRight size={20} /></>
                    ) : (
                        <>Готово <Check size={20} /></>
                    )}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}