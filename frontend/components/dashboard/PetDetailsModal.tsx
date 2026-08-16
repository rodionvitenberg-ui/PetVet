'use client';
import { addToast } from "@heroui/toast";
import { useTranslations, useLocale } from 'next-intl';
import { Activity, ChevronLeft } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import EditPetModal from './EditPetModal';
import UpdateGalleryModal from './UpdateGalleryModal';
import CreateEventModal from './CreateEventModal';
import { useAuth } from '@/components/providers/AuthProvider';
import UserProfileModal from './UserProfileModal';
import DeletePetModal from './DeletePetModal';
import { PetDetail, UserProfile } from '@/types/pet';
import { PetEvent } from '@/types/event';
import { getMediaUrl } from './PetDetailUtils';
import { usePersistedState } from '@/hooks/usePersistedState';
import PetPhotoCarousel from './PetPhotoCarousel';
import PetInfoTab from './PetInfoTab';
import PetMedicalTab from './PetMedicalTab';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PetDetailsModal({ petId, isOpen, onClose }: { petId: number | null, isOpen: boolean, onClose: () => void }) {
  const { user: currentUser } = useAuth();
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [pet, setPet] = useState<PetDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'medical'>('info');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [panYByPet, setPanYByPet] = usePersistedState<Record<number, number>>('petModal.panYByPet', {});
  const [savedImageIndex, setSavedImageIndex] = usePersistedState<Record<number, number>>('petModal.savedImageIndex', {});
  const [loading, setLoading] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PetEvent | null>(null);
  const [displayPetId, setDisplayPetId] = useState<number | null>(null);
  const t = useTranslations('Passport');
  const locale = useLocale();
  const [isClient, setIsClient] = useState(false);
  const [swipeStart, setSwipeStart] = useState<number | null>(null);

  useEffect(() => { setIsClient(true); }, []);

  const isOwner = currentUser && pet && (
    Number(currentUser.id) === Number(pet.owner) || Number(currentUser.id) === Number(pet.created_by)
  );

  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent) => {
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setSwipeStart(x);
  };

  const handleSwipeEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (swipeStart === null) return;
    const x = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = swipeStart - x;
    if (diff > 50) nextImage();
    else if (diff < -50) prevImage();
    setSwipeStart(null);
  };

  const saveViewState = (index: number) => {
    if (!displayPetId) return;
    setSavedImageIndex(prev => ({ ...prev, [displayPetId]: index }));
  };

  useEffect(() => {
    if (isOpen && petId) setDisplayPetId(petId);
  }, [isOpen, petId]);

  const fetchPetData = () => {
    if (!displayPetId) return;
    setLoading(true);
    const token = localStorage.getItem('access_token');
    fetch(`${API_URL}/api/pets/${displayPetId}/`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
      .then(res => { if (!res.ok) throw new Error(res.statusText); return res.json(); })
      .then(data => { setPet(data); setCurrentImageIndex(savedImageIndex[data.id] ?? 0); })
      .catch(err => console.error("Error loading pet:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && displayPetId) { setPet(null); fetchPetData(); }
  }, [isOpen, displayPetId]);

  const handleDeleteClick = () => setIsDeleteModalOpen(true);

  const confirmDelete = async () => {
    if (!pet) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/pets/${pet.id}/`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete pet');
      setIsDeleteModalOpen(false);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error(error);
      addToast({ title: "Error", description: "Failed to delete pet.", color: "danger", variant: "flat" });
    } finally { setIsDeleting(false); }
  };

  const openCreateHealthEvent = () => { setEditingEvent(null); setIsHealthModalOpen(true); };
  const openEditHealthEvent = (event: PetEvent) => { setEditingEvent(event); setIsHealthModalOpen(true); };

  const isLoadingState = loading || !pet;
  const allImages = pet?.images?.map(img => img.image) || [];
  const nextImage = () => {
    if (allImages.length > 0) {
      setCurrentImageIndex((prev) => {
        const next = (prev + 1) % allImages.length;
        saveViewState(next);
        return next;
      });
    }
  };
  const prevImage = () => {
    if (allImages.length > 0) {
      setCurrentImageIndex((prev) => {
        const next = (prev - 1 + allImages.length) % allImages.length;
        saveViewState(next);
        return next;
      });
    }
  };
  const handleParentClick = (id: number) => { setDisplayPetId(id); setActiveTab('info'); };
  const canDelete = currentUser && pet && (currentUser.id === pet.owner || currentUser.id === pet.created_by);

  return (
    <>
      {pet && (
        <>
          {isEditOpen && <EditPetModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} pet={pet as PetDetail} onSuccess={fetchPetData} />}
          {isGalleryOpen && <UpdateGalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} petId={pet.id} images={pet.images || []} onSuccess={fetchPetData} />}
          {isHealthModalOpen && <CreateEventModal isOpen={isHealthModalOpen} onClose={() => setIsHealthModalOpen(false)} petId={pet.id} onSuccess={fetchPetData} initialData={editingEvent} />}
          {isDeleteModalOpen && <DeletePetModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} petName={pet.name} isDeleting={isDeleting} />}
        </>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="flex h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 rounded-[var(--radius-2xl)]"
          showCloseButton={false}
        >
          {isLoadingState && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-card">
              <div className="flex flex-col items-center gap-3">
                <Activity className="h-10 w-10 animate-spin text-primary" />
                <p className="font-medium text-muted-foreground">Loading profile...</p>
              </div>
            </div>
          )}

          <PetPhotoCarousel
            images={allImages}
            currentIndex={currentImageIndex}
            petName={pet?.name || ''}
            petOwnerName={pet?.owner_info && !pet.owner_info.is_temporary ? pet.owner_info.name : undefined}
            petOwnerAvatar={pet?.owner_info?.avatar || null}
            petGender={pet?.gender}
            petBreed={pet?.breed}
            petBirthDate={pet?.birth_date}
            panY={displayPetId ? panYByPet[displayPetId] ?? 0 : 0}
            onPanYChange={(y) => displayPetId && setPanYByPet(prev => ({ ...prev, [displayPetId]: y }))}
            onClose={onClose}
            onOwnerClick={pet?.owner_info && !pet.owner_info.is_temporary ? () => setSelectedUserProfile(pet?.owner_info as UserProfile) : undefined}
            onSwipeStart={handleSwipeStart}
            onSwipeEnd={handleSwipeEnd}
          />

          {petId !== displayPetId && (
            <button
              onClick={(e) => { e.stopPropagation(); setDisplayPetId(petId); }}
              className="pointer-events-auto absolute left-4 top-4 z-40 flex items-center gap-2 rounded-full bg-black/20 px-3 py-2 text-sm font-bold text-white transition hover:bg-black/40"
            >
              <ChevronLeft size={16} /> Return
            </button>
          )}

          <div className="z-10 flex shrink-0 border-b border-border bg-card">
            <button onClick={() => setActiveTab('info')}
              className={`relative flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'info' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              Profile
              {activeTab === 'info' && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-foreground" />}
            </button>
            <button onClick={() => setActiveTab('medical')}
              className={`relative flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'medical' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              Medical Record
              {activeTab === 'medical' && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-foreground" />}
            </button>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto bg-card p-6">
            <div className="mx-auto max-w-xl space-y-8">
              {pet && (
                <div className={activeTab === 'info' ? '' : 'hidden'}>
                  <PetInfoTab
                    pet={pet}
                    isClient={isClient}
                    canDelete={!!canDelete}
                    onOpenGallery={() => setIsGalleryOpen(true)}
                    onOpenEdit={() => setIsEditOpen(true)}
                    onOpenDelete={handleDeleteClick}
                    onParentClick={handleParentClick}
                    onOwnerClick={() => setSelectedUserProfile(pet?.owner_info as UserProfile)}
                  />
                </div>
              )}
              {pet && (
                <div className={activeTab === 'medical' ? '' : 'hidden'}>
                  <PetMedicalTab
                    pet={pet}
                    currentUser={currentUser}
                    onOpenCreateEvent={openCreateHealthEvent}
                    onOpenEditEvent={openEditHealthEvent}
                    onVetClick={(vet) => setSelectedUserProfile(vet)}
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <UserProfileModal isOpen={!!selectedUserProfile} onClose={() => setSelectedUserProfile(null)} user={selectedUserProfile} />
    </>
  );
}