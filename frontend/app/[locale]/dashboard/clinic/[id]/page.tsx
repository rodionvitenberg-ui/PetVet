'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import AuthGuard from '@/components/providers/AuthGuard';
import { 
  Building2, Users, UserPlus, Link2, Copy, Trash2, Loader2,
  MapPin, Phone, Mail, Edit3, Check, X, ArrowLeft, ClipboardList
} from 'lucide-react';
import { VetClinic, ClinicMember } from '@/types/clinic';
import { 
  fetchClinic, updateClinic, fetchMembers, createInvite, removeMember 
} from '@/services/clinicService';
import ClinicTemplates from '@/components/dashboard/ClinicTemplates';
import { addToast } from "@heroui/toast";

export default function ClinicPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const clinicId = parseInt(params.id as string, 10);

  const [clinic, setClinic] = useState<VetClinic | null>(null);
  const [members, setMembers] = useState<ClinicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'templates'>('members');

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', phone: '', email: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    loadData();
  }, [clinicId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clinicData, membersData] = await Promise.all([
        fetchClinic(clinicId),
        fetchMembers(clinicId),
      ]);
      setClinic(clinicData);
      setMembers(membersData);
      setEditForm({
        name: clinicData.name,
        address: clinicData.address || '',
        phone: clinicData.phone || '',
        email: clinicData.email || '',
        description: clinicData.description || '',
      });
    } catch (err) {
      router.push('/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateClinic(clinicId, editForm);
      setClinic(updated);
      setIsEditing(false);
      addToast({ title: "Clinic updated", color: "success", variant: "flat" });
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, color: "danger", variant: "flat" });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const invite = await createInvite(clinicId);
      const link = `${window.location.origin}/dashboard/clinic/join?token=${invite.token}`;
      setInviteLink(link);
      addToast({ title: "Invite link created", color: "success", variant: "flat" });
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, color: "danger", variant: "flat" });
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      addToast({ title: "Link copied!", color: "success", variant: "flat" });
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Remove this veterinarian from the clinic?')) return;
    setRemovingId(userId);
    try {
      await removeMember(clinicId, userId);
      setMembers(prev => prev.filter(m => m.user !== userId));
      addToast({ title: "Member removed", color: "default", variant: "flat" });
    } catch (err: any) {
      addToast({ title: "Error", description: err.message, color: "danger", variant: "flat" });
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AuthGuard>
    );
  }

  if (!clinic) return null;

  const isAdmin = clinic.is_admin;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-muted/50 pt-24 pb-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Back button */}
          <button onClick={() => router.push('/profile')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Profile</span>
          </button>

          {/* Clinic Header Card */}
          <div className="bg-card rounded-3xl shadow-sm border border-border p-6 sm:p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-success/10 p-3 rounded-2xl">
                  <Building2 size={28} className="text-success" />
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="text-2xl font-bold text-foreground border-b-2 border-emerald-300 outline-none bg-transparent w-full"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      autoFocus
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-foreground">{clinic.name}</h1>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {members.length} member{members.length !== 1 ? 's' : ''}
                    {isAdmin && <span className="ml-2 bg-success/10 text-success text-xs font-bold px-2 py-0.5 rounded-full">Admin</span>}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : isEditing ? <Check size={16} /> : <Edit3 size={16} />}
                  {isEditing ? 'Save' : 'Edit'}
                </button>
              )}
            </div>

            {/* Clinic details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Address</p>
                  {isEditing ? (
                    <input
                      type="text"
                      className="text-sm text-foreground border-b border-border outline-none bg-transparent w-full"
                      value={editForm.address}
                      onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-foreground">{clinic.address || '—'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Phone</p>
                  {isEditing ? (
                    <input
                      type="text"
                      className="text-sm text-foreground border-b border-border outline-none bg-transparent w-full"
                      value={editForm.phone}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-foreground">{clinic.phone || '—'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Email</p>
                  {isEditing ? (
                    <input
                      type="email"
                      className="text-sm text-foreground border-b border-border outline-none bg-transparent w-full"
                      value={editForm.email}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm text-foreground">{clinic.email || '—'}</p>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Description</p>
                <textarea
                  rows={3}
                  className="w-full border border-border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200 transition"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
            )}
            {!isEditing && clinic.description && (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{clinic.description}</p>
            )}
          </div>

          {/* Tabs: Members / Templates */}
          <div className="bg-card rounded-3xl shadow-sm border border-border p-6 sm:p-8 mb-6">
            <div className="flex items-center gap-1 mb-6 border-b border-border pb-4">
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'members' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-muted-foreground'}`}
              >
                <Users size={18} /> Veterinarians
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'templates' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-muted-foreground'}`}
              >
                <ClipboardList size={18} /> Templates
              </button>
            </div>

            {activeTab === 'members' ? (
            <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users size={20} className="text-muted-foreground" /> Veterinarians
              </h2>
              {isAdmin && (
                <button
                  onClick={handleGenerateInvite}
                  disabled={generatingInvite}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-50 transition"
                >
                  {generatingInvite ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Invite
                </button>
              )}
            </div>

            {/* Invite link */}
            {inviteLink && (
              <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <Link2 size={18} className="text-success shrink-0" />
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 bg-transparent text-sm text-emerald-800 outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-card rounded-lg hover:bg-success/10 transition text-success"
                >
                  <Copy size={16} />
                </button>
              </div>
            )}

            {/* Members list */}
            <div className="space-y-2">
              {members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-muted transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-muted-foreground">
                        {(member.first_name || member.username)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {member.first_name && member.last_name
                          ? `${member.first_name} ${member.last_name}`
                          : member.username}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      member.role === 'admin'
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {member.role}
                    </span>
                    {isAdmin && member.role !== 'admin' && (
                      <button
                        onClick={() => handleRemoveMember(member.user)}
                        disabled={removingId === member.user}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                      >
                        {removingId === member.user ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </>
            ) : (
              <ClinicTemplates clinicId={clinicId} />
            )}
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}