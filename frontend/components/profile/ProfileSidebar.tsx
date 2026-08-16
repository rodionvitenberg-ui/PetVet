'use client';

import { useState, useRef } from 'react';
import { Camera, User } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { addToast } from "@heroui/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function ProfileSidebar() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('avatar', file);

    try {
      setUploading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/api/auth/me/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: uploadData
      });

      if (!res.ok) throw new Error('Error');
      const updatedUser = await res.json();
      updateUser(updatedUser);

      addToast({ title: "Picture updated", color: "success", variant: "flat" });
    } catch {
      addToast({ title: "Failed to upload picture", color: "danger", variant: "flat" });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border text-center relative overflow-hidden">
      <div className="relative inline-block group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-background shadow-lg mx-auto relative bg-muted">
          {user.avatar ? (
            <img
              src={user.avatar.startsWith('http') ? user.avatar : `${API_URL}${user.avatar}`}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <User size={64} />
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium gap-2">
            <Camera size={20} />
            {uploading && <span className="animate-spin">⟳</span>}
          </div>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      </div>

      <h2 className="mt-4 text-xl font-bold text-foreground">{user.username}</h2>
      <p className="text-muted-foreground text-sm mb-4">{user.email}</p>

      <div className="flex justify-center gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${user.is_veterinarian ? 'bg-success/10 text-success border-success/20' : 'bg-primary/10 text-primary border-primary/15'}`}>
          {user.is_veterinarian ? 'Veterinarian' : 'Owner'}
        </span>
        {user.is_veterinarian && user.is_verified && (
          <span className="bg-accent/15 text-accent-foreground px-3 py-1 rounded-full text-xs font-bold border border-yellow-100">
            Verified
          </span>
        )}
      </div>
    </div>
  );
}