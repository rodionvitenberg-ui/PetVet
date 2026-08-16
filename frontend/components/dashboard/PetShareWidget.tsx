'use client';
import { addToast } from "@heroui/toast";

import React, { useState } from 'react';
import { Share2, X, Copy, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface PetShareWidgetProps {
  petId: number;
  petName: string;
  isCompact?: boolean;
}

export default function PetShareWidget({ petId, petName, isCompact }: PetShareWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModalOpen(true);
    if (shareLink) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/pets/${petId}/share_token/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Error generating share link');
      const data = await res.json();
      setShareLink(`${window.location.origin}/share?token=${data.token}`);
    } catch (error) {
      console.error("Failed to generate share link:", error);
      addToast({ title: "Error", description: "Cannot generate share link. Please try again later.", color: "danger", variant: "flat" });
      setIsModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <>
      <button
        onClick={handleShareClick}
        className={`bg-card text-primary shadow-md hover:bg-primary/10 hover:scale-110 transition-all duration-300 group/btn rounded-full ${isCompact ? 'p-1.5' : 'p-2.5'}`}
        title="Share Profile"
      >
        <Share2 size={isCompact ? 14 : 18} className="transition-transform group-hover/btn:-rotate-12" />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
          <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Share2 className="text-primary" size={20} />
                Access to {petName}'s Profile
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-muted rounded-full text-muted-foreground transition">
                <X size={20} />
              </button>
            </div>
            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Share2 className="animate-bounce text-primary/60" size={24} />
                <p className="text-sm font-medium">Generating a secure link...</p>
              </div>
            ) : shareLink ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">Send this link to your veterinarian...</p>
                <div className="bg-muted border border-border rounded-xl p-3 break-all text-sm text-foreground font-mono select-all">{shareLink}</div>
                <button onClick={copyToClipboard} className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all duration-200 ${isCopied ? 'bg-success text-success-foreground shadow-md shadow-success/20' : 'bg-primary hover:bg-primary text-primary-foreground shadow-md shadow-primary/20'}`}>
                  {isCopied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy Link</>}
                </button>
              </div>
            ) : (
              <div className="py-4 text-center text-destructive text-sm">Failed to generate link.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}