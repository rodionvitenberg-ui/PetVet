'use client';

import { useState, useEffect } from 'react';
import { Save, Lock, User, MapPin, Phone, Loader2, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import type { User as AuthUser } from '@/components/providers/AuthProvider';
import { fetchClinics } from '@/services/clinicService';
import { VetClinic } from '@/types/clinic';
import { addToast } from "@heroui/toast";
import CreateClinicModal from '@/components/dashboard/CreateClinicModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  clinic_name: string;
  about: string;
  email: string;
}

export default function ProfileForm() {
  const { user, updateUser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    phone: '',
    city: '',
    clinic_name: '',
    about: '',
    email: '',
  });

  const [passwords, setPasswords] = useState({ password: '', confirm_password: '' });
  const [clinics, setClinics] = useState<VetClinic[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [isCreateClinicOpen, setIsCreateClinicOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        city: user.city || '',
        clinic_name: user.clinic_name || '',
        about: user.about || '',
        email: user.email || '',
      });
      if (user.is_veterinarian) {
        loadClinics();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadClinics = async () => {
    setClinicsLoading(true);
    try {
      const data = await fetchClinics();
      setClinics(data);
    } catch {
      // silently fail
    } finally {
      setClinicsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const payload: Record<string, string> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        city: formData.city,
        clinic_name: formData.clinic_name,
        about: formData.about,
      };
      // Email менять нельзя через этот эндпоинт.

      if (passwords.password) {
        if (passwords.password !== passwords.confirm_password) {
          throw new Error('Passwords do not match');
        }
        if (passwords.password.length < 6) {
          throw new Error('Password is too short');
        }
        payload.password = passwords.password;
      }

      const res = await fetch(`${API_URL}/api/auth/me/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save profile');

      const updatedUser = await res.json();
      updateUser(updatedUser);

      addToast({ title: "Profile saved!", color: "success", variant: "flat" });
      setPasswords({ password: '', confirm_password: '' });
    } catch (err) {
      addToast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to save profile',
        color: "danger",
        variant: "flat"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <form onSubmit={handleSaveProfile} className="bg-card p-6 rounded-2xl shadow-sm border border-border">
        <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
          <User size={20} className="text-primary" /> Personal Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">First Name</label>
            <input
              type="text"
              className="w-full border border-input rounded-xl p-3 bg-background text-foreground focus-ring transition"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Last Name</label>
            <input
              type="text"
              className="w-full border border-input rounded-xl p-3 bg-background text-foreground focus-ring transition"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">About / Specialization</label>
          <textarea
            rows={3}
            className="w-full border border-input rounded-xl p-3 bg-background text-foreground focus-ring transition resize-none"
            value={formData.about}
            placeholder={user.is_veterinarian ? "Tell us about your experience and services..." : "A few words about you..."}
            onChange={(e) => setFormData({ ...formData, about: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">City</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
              <input
                type="text"
                className="w-full border border-input rounded-xl p-3 pl-10 bg-background text-foreground focus-ring transition"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Main Phone</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
              <input
                type="text"
                className="w-full border border-input rounded-xl p-3 pl-10 bg-background text-foreground focus-ring transition"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="For account login"
              />
            </div>
          </div>
        </div>

        {user.is_veterinarian && (
          <div className="mb-8 bg-success/10 p-4 rounded-xl border border-success/20">
            <label className="block text-xs font-bold text-success mb-3 uppercase flex items-center gap-1">
              <Building2 size={14} /> My Clinic
            </label>
            {clinicsLoading ? (
              <div className="flex justify-center py-2"><Loader2 className="animate-spin text-success" size={18} /></div>
            ) : clinics.length > 0 ? (
              <div className="space-y-2">
                {clinics.map(clinic => (
                  <div key={clinic.id} className="flex items-center justify-between bg-card p-3 rounded-xl border border-success/30">
                    <div>
                      <p className="text-sm font-bold text-foreground">{clinic.name}</p>
                      <p className="text-xs text-muted-foreground">{clinic.members_count} member{clinic.members_count !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/clinic/${clinic.id}`)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
                    >
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-emerald-900">No clinic linked</p>
                <button
                  type="button"
                  onClick={() => setIsCreateClinicOpen(true)}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
                >
                  Create Clinic
                </button>
              </div>
            )}
          </div>
        )}

        {/* Смена пароля */}
        <div className="pt-6 border-t border-border">
          <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Lock size={16} className="text-muted-foreground" /> Change Password
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="password"
                placeholder="New Password"
                className="w-full border border-input rounded-xl p-3 text-sm bg-background text-foreground focus-ring"
                value={passwords.password}
                onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Confirm Password"
                className="w-full border border-input rounded-xl p-3 text-sm bg-background text-foreground focus-ring"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
            Save Changes
          </button>
        </div>
      </form>

      <CreateClinicModal
        isOpen={isCreateClinicOpen}
        onClose={() => setIsCreateClinicOpen(false)}
        onCreated={loadClinics}
      />
    </>
  );
}