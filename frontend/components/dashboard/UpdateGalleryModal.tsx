'use client';

import React, { useState, useRef } from 'react';
import { Trash2, Plus, UploadCloud, ImageIcon, AlertCircle, Loader2, X } from 'lucide-react';
import { addToast } from "@heroui/toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpdateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  petId: number;
  images: { id: number; image: string; is_main: boolean }[];
  onSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const getMediaUrl = (url: string | null) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
};

export default function UpdateGalleryModal({ isOpen, onClose, petId, images, onSuccess }: UpdateGalleryModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);
    const token = localStorage.getItem('access_token');

    try {
      let uploadedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);

        const res = await fetch(`${API_URL}/api/pets/${petId}/upload_image/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (res.status === 403) throw new Error('You do not have permission to edit this pet');
        if (!res.ok) throw new Error('Error uploading images. Please check the file format.');
        uploadedCount++;
      }

      addToast({
        title: "Images uploaded",
        description: `Number of images added: ${uploadedCount}`,
        color: "success",
        variant: "flat"
      });

      onSuccess();
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Failed to upload images");
      addToast({
        title: "Error uploading",
        description: error.message,
        color: "danger",
        variant: "flat"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const requestDelete = (imageId: number) => {
    setError(null);
    setDeletingId(imageId);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${API_URL}/api/pet_images/${deletingId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 403) throw new Error('You do not have permission to delete this image');
      if (res.ok) {
        addToast({ title: "Image deleted", color: "default", variant: "flat" });
        setDeletingId(null);
        onSuccess();
      } else {
        throw new Error("Server error occurred while deleting the image.");
      }
    } catch (error: any) {
      console.error(error);
      setError(error.message || "Network error");
      setDeletingId(null);
      addToast({
        title: "Failed to delete image",
        description: error.message,
        color: "danger",
        variant: "flat"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="flex-row items-center gap-2 border-b border-border bg-muted/40 px-4 py-3 sm:text-left">
          <ImageIcon size={20} className="text-primary" />
          <DialogTitle>Pet Gallery</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-3 border-b border-destructive/20 bg-destructive/5 p-3 text-sm font-medium text-destructive">
            <AlertCircle size={18} className="shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto rounded p-1 hover:bg-destructive/10">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="relative overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <label className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-input transition group hover:border-primary hover:bg-primary/5 ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
              {isUploading ? (
                <UploadCloud className="animate-bounce text-primary" size={32} />
              ) : (
                <Plus size={32} className="text-muted-foreground transition group-hover:text-primary" />
              )}
              <span className="mt-2 text-xs font-medium text-muted-foreground">
                {isUploading ? 'Uploading...' : 'Add Photo'}
              </span>
            </label>

            {images.map((img) => (
              <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border shadow-sm">
                <img
                  src={getMediaUrl(img.image)!}
                  alt="gallery"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />

                <button
                  onClick={() => requestDelete(img.id)}
                  className="absolute right-2 top-2 rounded-lg bg-destructive p-1.5 text-destructive-foreground shadow-md transition-all hover:bg-destructive/90 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
                  title="Удалить фото"
                >
                  <Trash2 size={16} />
                </button>

                {img.is_main && (
                  <div className="absolute bottom-2 left-2 rounded-md bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm backdrop-blur-md">
                    Main
                  </div>
                )}
              </div>
            ))}
          </div>

          {deletingId && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Trash2 size={24} />
                </div>
                <h4 className="mb-2 text-lg font-bold text-foreground">Delete this image?</h4>
                <p className="mb-6 text-sm text-muted-foreground">This action cannot be undone.</p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={confirmDelete}>
                    <Loader2 className="hidden" />Yes, delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}