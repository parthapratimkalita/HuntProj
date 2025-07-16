export interface Provider {
  id: number;
  user_id: number;
  business_name?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  business_license?: string;
  experience_years?: number;
  property_count?: number;
  specialties?: string[];
  bio?: string;
  website?: string;
  social_media?: Record<string, string>;
  insurance_info?: string;
  certifications?: string[];
  status: "pending" | "approved" | "rejected";
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  rejected_at?: string;
}