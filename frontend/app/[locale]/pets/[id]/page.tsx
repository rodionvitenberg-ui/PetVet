'use client';
import { addToast } from "@heroui/toast";

import React, { useState, useEffect } from 'react';
import { Activity, FileDown } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

// === ИМПОРТЫ МОДАЛОК ===
import EditPetModal from '@/components/dashboard/EditPetModal';
import UpdateGalleryModal from '@/components/dashboard/UpdateGalleryModal';
import CreateEventModal from '@/components/dashboard/CreateEventModal';
import UserProfileModal from '@/components/dashboard/UserProfileModal';
import DeletePetModal from '@/components/dashboard/DeletePetModal';

// PDFDownloadLink is client-only (@react-pdf/renderer): load it without SSR
import dynamic from 'next/dynamic';
const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then(m => m.PDFDownloadLink), { ssr: false });
import { PetPassportDocument } from '@/components/pdf/PetPassportDocument';

// === ДЕКОМПОЗИРОВАННЫЕ СЕКЦИИ ===
import PetHeroCarousel from '@/components/pet-page/PetHeroCarousel';
import PetInfoSection from '@/components/pet-page/PetInfoSection';
import PetMedicalSection from '@/components/pet-page/PetMedicalSection';

import { useTranslations, useLocale } from 'next-intl';

// === ТИПЫ ===
import { PetDetail, UserProfile } from '@/types/pet';
import { PetEvent } from '@/types/event';

// Хардкод содержится в декомпозированных секциях и PDF-документе.
const PDF_CLASS = "sm:col-span-2 w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();

  const t = useTranslations('Passport');
  const locale = useLocale();

  const petId = Number(params?.id);

  const [pet, setPet] = useState<PetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'medical'>('info');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [editingEvent, setEditingEvent] = useState<PetEvent | null>(null);

  const fetchPetData = () => {
    if (!petId) return;
    setLoading(true);
    const token = localStorage.getItem('access_token');

    fetch(`${API_URL}/api/pets/${petId}/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
      .then(res => {
        if (res.status === 404) {
          router.push('/dashboard');
          return null;
        }
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then(data => {
        if (data) setPet(data);
      })
      .catch(err => console.error("Ошибка загрузки:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'medical') {
      setActiveTab('medical');
    }
  }, [searchParams]);

  const confirmDelete = async () => {
    if (!pet) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_URL}/api/pets/${pet.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      addToast({ title: "Error", description: "Ошибка удаления.", color: "danger", variant: "flat" });
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const openEditEvent = (event: PetEvent) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };

  const canDelete = currentUser && pet && (Number(currentUser.id) === Number(pet.owner) || Number(currentUser.id) === Number(pet.created_by));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Activity className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Загружаем профиль...</p>
      </div>
    );
  }

  if (!pet) return null;

  return (
    <div className="min-h-screen bg-background pb-20 pt-20 lg:pt-24">
      {/* МОДАЛКИ */}
      <>
        {isEditOpen && (
          <EditPetModal
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            pet={pet}
            onSuccess={fetchPetData}
          />
        )}

        {isGalleryOpen && (
          <UpdateGalleryModal
            isOpen={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            petId={pet.id}
            images={pet.images || []}
            onSuccess={fetchPetData}
          />
        )}

        {isEventModalOpen && (
          <CreateEventModal
            isOpen={isEventModalOpen}
            onClose={() => setIsEventModalOpen(false)}
            petId={pet.id}
            onSuccess={fetchPetData}
            initialData={editingEvent}
          />
        )}

        {isDeleteModalOpen && (
          <DeletePetModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={confirmDelete}
            petName={pet.name}
            isDeleting={isDeleting}
          />
        )}

        {selectedUserProfile && (
          <UserProfileModal
            isOpen={!!selectedUserProfile}
            onClose={() => setSelectedUserProfile(null)}
            user={selectedUserProfile}
          />
        )}
      </>

      <div className="max-w-4xl mx-auto bg-card shadow-xl rounded-none sm:rounded-[2rem] overflow-hidden min-h-[calc(100vh-6rem)] flex flex-col">
        {/* ХЕДЕР СТРАНИЦЫ (СВАЙП) */}
        <PetHeroCarousel
          pet={pet}
          onBack={() => router.back()}
          onOwnerClick={() => setSelectedUserProfile(pet.owner_info as UserProfile)}
          showOwnerLink={!!(pet.owner_info && currentUser?.id !== pet.owner_info.id)}
        />

        {/* ТАБЫ */}
        <div className="flex border-b border-border bg-card z-20 sticky top-16 lg:top-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-4 font-bold text-sm uppercase tracking-wide transition-all relative ${activeTab === 'info' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            Анкета
            {activeTab === 'info' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
          </button>
          <button
            onClick={() => setActiveTab('medical')}
            className={`flex-1 py-4 font-bold text-sm uppercase tracking-wide transition-all relative ${activeTab === 'medical' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            Медкарта
            {activeTab === 'medical' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
          </button>
        </div>

        {/* КОНТЕНТ */}
        <div className="flex-1 bg-card p-4 sm:p-8">
          <div className="max-w-2xl mx-auto space-y-8">
            {activeTab === 'info' && (
              <PetInfoSection
                pet={pet}
                canDelete={!!canDelete}
                onGalleryOpen={() => setIsGalleryOpen(true)}
                onEdit={() => router.push(`/pets/${pet.id}/edit`)}
                onDelete={() => setIsDeleteModalOpen(true)}
                onParentClick={(parentId) => router.push(`/pets/${parentId}`)}
                pdfTrigger={
                  <PDFDownloadLink
                    document={<PetPassportDocument pet={pet} t={t} locale={locale} />}
                    fileName={`Passport_${pet.name}.pdf`}
                    className={PDF_CLASS}
                  >
                    {({ loading }) => (
                      loading
                        ? 'Генерация документа...'
                        : <><FileDown size={18} /> СКАЧАТЬ PDF-ПАСПОРТ ({locale.toUpperCase()})</>
                    )}
                  </PDFDownloadLink>
                }
              />
            )}

            {activeTab === 'medical' && (
              <PetMedicalSection
                pet={pet}
                onVetClick={(vet) => setSelectedUserProfile(vet)}
                onCreateEvent={openCreateEvent}
                onEditEvent={openEditEvent}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}