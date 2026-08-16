'use client';

import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import ProfileForm from '@/components/profile/ProfileForm';
import ContactsSection from '@/components/profile/ContactsSection';
import DangerZone from '@/components/profile/DangerZone';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-16 pt-24 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <ProfileSidebar />
        </div>

        <div className="lg:col-span-2 space-y-8">
          <ProfileForm />
          <ContactsSection />
          <DangerZone />
        </div>
      </div>
    </div>
  );
}