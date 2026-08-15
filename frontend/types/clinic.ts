export interface VetClinic {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  is_active: boolean;
  is_admin: boolean;
  members_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClinicMember {
  id: number;
  user: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_veterinarian: boolean;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface ClinicInvite {
  id: number;
  token: string;
  is_used: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface ExamTemplate {
  id: number;
  clinic: number;
  name: string;
  category: 'examination' | 'vaccination' | 'surgery' | 'parasite' | 'grooming' | 'laboratory' | 'other';
  default_fields: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
