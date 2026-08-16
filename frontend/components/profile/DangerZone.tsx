'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { addToast } from "@heroui/toast";
import DeleteAccountModal from '@/components/DeleteAccountModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function DangerZone() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/auth/me/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      } else {
        addToast({ title: "Error deleting account", description: "Try again later", color: "danger" });
        setIsDeleting(false);
        setIsDeleteModalOpen(false);
      }
    } catch {
      addToast({ title: "Network error", color: "danger" });
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <>
      <div className="bg-destructive/10 p-6 rounded-2xl border border-destructive/20">
        <h3 className="text-lg font-bold text-destructive mb-4 flex items-center gap-2">
          <AlertTriangle size={20} /> Dangerous Zone
        </h3>
        <p className="text-sm text-destructive/80 mb-6 leading-relaxed">
          Deleting your account will result in the complete removal of all your personal data...
        </p>

        <div className="flex justify-end">
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="bg-card border-2 border-destructive/30 text-destructive px-6 py-3 rounded-xl font-bold hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition shadow-sm flex items-center gap-2"
          >
            <Trash2 size={18} />
            Delete Account
          </button>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
    </>
  );
}