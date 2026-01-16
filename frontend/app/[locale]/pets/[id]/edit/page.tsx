'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileDown } from 'lucide-react';
import { usePetForm } from '@/hooks/usePetForm';
import { StepBasicInfo, StepDetails, StepPhotos } from '@/components/pet-form/PetFormSteps';
import { PetDetail } from '@/types/pet';
import { useTranslations, useLocale } from 'next-intl';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// [FIX] Тип пропсов для Next.js 15
interface PageProps {
    params: Promise<{ id: string }>; // params теперь Promise!
}

export default function MobileEditPetPage({ params }: PageProps) {
  // [FIX] Разворачиваем params через React.use()
  const resolvedParams = React.use(params);
  const petId = resolvedParams.id;

  const router = useRouter();
  const [initialPet, setInitialPet] = useState<PetDetail | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  const t = useTranslations('Passport');
  const locale = useLocale();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  // 1. Загружаем данные питомца
  useEffect(() => {
      if (!petId) return;
      const fetchPet = async () => {
          try {
              const token = localStorage.getItem('access_token');
              const res = await fetch(`${API_URL}/api/pets/${petId}/`, {
                  headers: token ? { 'Authorization': `Bearer ${token}` } : {}
              });
              if (res.ok) setInitialPet(await res.json());
              else router.push('/dashboard'); 
          } catch (e) {
              console.error(e);
          } finally {
              setLoadingInitial(false);
          }
      };
      fetchPet();
  }, [petId]);

  // 2. Инициализируем хук
  const {
    step, formData, dictionaries, files, previewUrls, isLoading, isSubmitting, error,
    updateField, handleCategorySelect, toggleTag, setAttributeValue, handleFileChange, removeFile,
    nextStep, prevStep, submit,
    createCustomTag, createCustomAttribute
  } = usePetForm({ 
      mode: 'edit', 
      initialData: initialPet, 
      onSuccess: () => {
          router.push(`/mobile/pet/${petId}`); 
          router.refresh();
      } 
  });

  if (loadingInitial || !initialPet) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50">Загрузка...</div>;
  }

  const handleNext = () => {
      if (step === 3) submit();
      else nextStep();
  };

  const handleFieldChange = (field: string, value: any) => updateField(field as any, value);

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
            <h1 className="text-2xl font-bold text-gray-900">Редактирование</h1>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-6 sm:p-8 min-h-[50vh] flex flex-col">
            <div className="flex-1">
                {step === 1 && (
                    <StepBasicInfo 
                        data={formData} onChange={handleFieldChange} 
                        categories={dictionaries.categories} onCategorySelect={handleCategorySelect} 
                        mode="edit" 
                    />
                )}
                {step === 2 && (
                    <StepDetails 
                        data={formData} attributes={dictionaries.attributes} tags={dictionaries.tags}
                        onAttributeChange={setAttributeValue} onTagToggle={toggleTag} onChange={handleFieldChange}
                        onCreateTag={createCustomTag} onCreateAttribute={createCustomAttribute}
                    />
                )}
                {step === 3 && (
                    <StepPhotos 
                        files={files} previewUrls={previewUrls} 
                        onFileChange={handleFileChange} onRemove={removeFile} 
                    />
                )}
            </div>

            {error && <div className="mt-4 p-3 text-red-600 bg-red-50 rounded-lg text-sm text-center">{error}</div>}

            <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">

                <button 
                    onClick={handleNext} 
                    disabled={isSubmitting}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition"
                >
                    {isSubmitting ? 'Сохраняем...' : step < 3 ? 'Далее' : 'Сохранить изменения'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}