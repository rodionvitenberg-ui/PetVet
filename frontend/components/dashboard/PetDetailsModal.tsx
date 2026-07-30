'use client';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { PetPassportDocument } from '@/components/pdf/PetPassportDocument';
import { useTranslations, useLocale } from 'next-intl';
import { FileDown, Activity, ChevronLeft } from 'lucide-react';
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
import PetPhotoCarousel from './PetPhotoCarousel';
import PetInfoTab from './PetInfoTab';
import PetMedicalTab from './PetMedicalTab';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function PetDetailsModal({ petId, isOpen, onClose }: { petId: number | null, isOpen: boolean, onClose: () => void }) {
  const { user: currentUser } = useAuth();
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [pet, setPet] = useState<PetDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'medical'>('info');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
      .then(data => { setPet(data); setCurrentImageIndex(0); })
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
      alert("Failed to delete pet.");
    } finally { setIsDeleting(false); }
  };

  const openCreateHealthEvent = () => { setEditingEvent(null); setIsHealthModalOpen(true); };
  const openEditHealthEvent = (event: PetEvent) => { setEditingEvent(event); setIsHealthModalOpen(true); };

  if (!isOpen) return null;

  const isLoadingState = loading || !pet;
  const allImages = pet?.images?.map(img => img.image) || [];
  const nextImage = () => { if (allImages.length > 0) setCurrentImageIndex((prev) => (prev + 1) % allImages.length); };
  const prevImage = () => { if (allImages.length > 0) setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length); };
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

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose} />
        <div className="relative bg-white w-full max-w-2xl h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          
          {isLoadingState && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white">
              <div className="flex flex-col items-center gap-3">
                <Activity className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-gray-400 font-medium">Loading profile...</p>
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
            onClose={onClose}
            onOwnerClick={pet?.owner_info && !pet.owner_info.is_temporary ? () => setSelectedUserProfile(pet?.owner_info as UserProfile) : undefined}
            onSwipeStart={handleSwipeStart}
            onSwipeEnd={handleSwipeEnd}
          />

          {petId !== displayPetId && (
            <button 
              onClick={(e) => { e.stopPropagation(); setDisplayPetId(petId); }}
              className="cursor-pointer absolute top-4 left-4 px-3 py-2 bg-black/20 hover:bg-black/40 text-white rounded-full z-40 transition flex items-center gap-2 text-sm font-bold pointer-events-auto"
            >
              <ChevronLeft size={16} /> Return
            </button>
          )}

          <div className="flex border-b border-gray-100 bg-white z-10 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setActiveTab('info'); }}
              className={`cursor-pointer flex-1 py-4 font-bold text-sm transition-all relative ${activeTab === 'info' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
              Profile
              {activeTab === 'info' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setActiveTab('medical'); }}
              className={`cursor-pointer flex-1 py-4 font-bold text-sm transition-all relative ${activeTab === 'medical' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
              Medical Record
              {activeTab === 'medical' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white p-6 custom-scrollbar">
            <div className="max-w-xl mx-auto space-y-8">
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
        </div>
      </div>
      <UserProfileModal isOpen={!!selectedUserProfile} onClose={() => setSelectedUserProfile(null)} user={selectedUserProfile} />
    </>
  );
}