import { VetClinic, ClinicMember, ClinicInvite, ExamTemplate } from '@/types/clinic';
import { apiClient } from '@/lib/apiClient';

export async function fetchClinics(): Promise<VetClinic[]> {
  return apiClient<VetClinic[]>('/api/clinics/');
}

export async function fetchClinic(id: number): Promise<VetClinic> {
  return apiClient<VetClinic>(`/api/clinics/${id}/`);
}

export async function createClinic(data: {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
}): Promise<VetClinic> {
  return apiClient<VetClinic>('/api/clinics/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateClinic(id: number, data: Partial<VetClinic>): Promise<VetClinic> {
  return apiClient<VetClinic>(`/api/clinics/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchMembers(clinicId: number): Promise<ClinicMember[]> {
  return apiClient<ClinicMember[]>(`/api/clinics/${clinicId}/members/`);
}

export async function removeMember(clinicId: number, userId: number): Promise<void> {
  await apiClient<void>(`/api/clinics/${clinicId}/members/${userId}/`, { method: 'DELETE' });
}

export async function createInvite(clinicId: number): Promise<ClinicInvite> {
  return apiClient<ClinicInvite>(`/api/clinics/${clinicId}/invite/`, { method: 'POST' });
}

export async function joinClinic(token: string): Promise<void> {
  await apiClient<void>('/api/clinics/join/', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// Exam Templates — nested: /api/clinics/{clinicId}/templates/
export async function fetchTemplates(clinicId: number): Promise<ExamTemplate[]> {
  return apiClient<ExamTemplate[]>(`/api/clinics/${clinicId}/templates/`);
}

export async function createTemplate(
  clinicId: number,
  data: { name: string; category: string; default_fields?: Record<string, any>; is_active?: boolean },
): Promise<ExamTemplate> {
  return apiClient<ExamTemplate>(`/api/clinics/${clinicId}/templates/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTemplate(
  clinicId: number,
  id: number,
  data: Partial<{ name: string; category: string; default_fields: Record<string, any>; is_active: boolean }>,
): Promise<ExamTemplate> {
  return apiClient<ExamTemplate>(`/api/clinics/${clinicId}/templates/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(clinicId: number, id: number): Promise<void> {
  await apiClient<void>(`/api/clinics/${clinicId}/templates/${id}/`, { method: 'DELETE' });
}