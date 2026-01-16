'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight, UserPlus, Phone } from 'lucide-react';
import { usePetForm } from '@/hooks/usePetForm';
import { StepBasicInfo, StepDetails, StepPhotos } from '@/components/pet-form/PetFormSteps';

export default function CreateClientPetPage() {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);

  // Инициализируем хук в режиме пациента
  const {
    step, formData, dictionaries, files, previewUrls, isLoading, isSubmitting, error,
    updateField, handleCategorySelect, toggleTag, setAttributeValue, handleFileChange, removeFile,
    nextStep, prevStep, submit,
    createCustomTag, createCustomAttribute
  } = usePetForm({ 
      mode: 'create_patient', // <--- ВАЖНО: Включает поля владельца в хуке
      onSuccess: () => setIsSuccess(true)
  });

  const handleFieldChange = (field: string, value: any) => updateField(field as any, value);

  // Хендлер навигации
  const handleNext = () => {
      if (step === 3) submit();
      else nextStep();
  };

  // Хендлер "Назад"
  const handleBack = () => {
      if (step === 1) router.back();
      else prevStep();
  };

  // === ЭКРАН УСПЕХА ===
  if (isSuccess) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <Check size={40} strokeWidth={3} />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Пациент создан!</h3>
                <p className="text-gray-500 mb-6 text-sm">
                    Карточка <b>{formData.name}</b> успешно добавлена в вашу базу.
                </p>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 max-w-xs w-full mb-8">
                    <div className="flex items-center justify-center gap-2 text-blue-800 font-bold mb-1 text-xs uppercase tracking-wide">
                        <Phone size={14} /> Привязка к клиенту
                    </div>
                    <p className="font-bold text-gray-900 text-lg">{formData.tempOwnerPhone}</p>
                </div>

                <button 
                    onClick={() => router.push('/dashboard')} 
                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-black transition shadow-lg"
                >
                    Вернуться в кабинет
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-23 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        
        {/* ХЕДЕР */}
        <div className="flex items-center gap-4 mb-6">
            <button 
                onClick={handleBack}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-gray-600 hover:text-gray-900 transition"
            >
                <ArrowLeft size={20} />
            </button>
            <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {step === 1 ? 'Новый пациент' : step === 2 ? 'Детали' : 'Фотографии'}
                </h1>
                {/* Индикатор */}
                <div className="flex gap-1.5 mt-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                            i === step ? 'bg-blue-600 w-8' : i < step ? 'bg-blue-300 w-4' : 'bg-gray-200 w-4'
                        }`} />
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 flex flex-col min-h-[60vh]">
            
            <div className="flex-1">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 space-y-3 text-gray-400">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                        <span>Загрузка...</span>
                    </div>
                ) : (
                    <>
                        {step === 1 && (
                            <StepBasicInfo 
                                data={formData} 
                                onChange={handleFieldChange} 
                                categories={dictionaries.categories} 
                                onCategorySelect={handleCategorySelect} 
                                mode="create_patient" // Важно! Включает инпуты владельца
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

            {/* ERROR */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 text-center animate-pulse">
                    {error}
                </div>
            )}

            {/* FOOTER */}
            <div className="mt-8 pt-6 border-t border-gray-100">
                <button 
                    onClick={handleNext} 
                    disabled={isSubmitting || isLoading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition disabled:opacity-70"
                >
                    {isSubmitting ? 'Сохранение...' : step < 3 ? (
                        <>Далее <ChevronRight size={20} /></>
                    ) : (
                        <>Создать пациента <Check size={20} /></>
                    )}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}