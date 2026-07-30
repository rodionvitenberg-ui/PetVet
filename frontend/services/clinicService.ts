import { VetClinic, ClinicMember, ClinicInvite, ExamTemplate } from '@/types/clinic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchClinics(): Promise<VetClinic[]> {
  const res = await fetch(`${API_URL}/api/clinics/`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch clinics');
  return res.json();
}

export async function fetchClinic(id: number): Promise<VetClinic> {
  const res = await fetch(`${API_URL}/api/clinics/${id}/`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch clinic');
  return res.json();
}

export async function createClinic(data: {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
}): Promise<VetClinic> {
  const res = await fetch(`${API_URL}/api/clinics/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to create clinic' }));
    throw new Error(err.error || 'Failed to create clinic');
  }
  return res.json();
}

export async function updateClinic(id: number, data: Partial<VetClinic>): Promise<VetClinic> {
  const res = await fetch(`${API_URL}/api/clinics/${id}/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update clinic');
  return res.json();
}

export async function fetchMembers(clinicId: number): Promise<ClinicMember[]> {
  const res = await fetch(`${API_URL}/api/clinics/${clinicId}/members/`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
}

export async function removeMember(clinicId: number, userId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/clinics/${clinicId}/members/${userId}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to remove member');
}

export async function createInvite(clinicId: number): Promise<ClinicInvite> {
  const res = await fetch(`${API_URL}/api/clinics/${clinicId}/invite/`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to create invite');
  return res.json();
}

export async function joinClinic(token: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/clinics/join/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to join clinic' }));
    throw new Error(err.error || 'Failed to join clinic');
  }
}

// Exam Templates
export async function fetchTemplates(clinicId: number): Promise<ExamTemplate[]> {
  const res = await fetch(`${API_URL}/api/clinics/${clinicId}/templates/`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function createTemplate(
  clinicId: number,
  data: { name: string; category: string; default_fields?: Record<string, any>; is_active?: boolean },
): Promise<ExamTemplate> {
  const res = await fetch(`${API_URL}/api/clinics/${clinicId}/templates/`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create template');
  return res.json();
}

export async function updateTemplate(
  id: number,
  data: Partial<{ name: string; category: string; default_fields: Record<string, any>; is_active: boolean }>,
): Promise<ExamTemplate> {
  const res = await fetch(`${API_URL}/api/clinics/templates/${id}/`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update template');
  return res.json();
}

export async function deleteTemplate(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/clinics/templates/${id}/`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete template');
}
