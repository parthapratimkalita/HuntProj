// types/property.ts
export interface PropertyImage {
  url: string;
  filename?: string;
  uploaded_at?: string;
  size?: number;
}

export interface HuntingPackage {
  name: string;
  huntingType: string;
  duration: number;
  price: number;
  maxHunters: number;
  description: string;
  includedItems?: string[];
  accommodationStatus: "included" | "extra" | "without";
  defaultAccommodation?: string;
}

export interface AccommodationOption {
  type: string;
  name: string;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  capacity: number;
  pricePerNight: number;
  amenities?: string[];
}

export interface AcreageBreakdown {
  acres: number;
  terrainType: string;
  description?: string;
}

export interface WildlifeInfo {
  species: string;
  estimatedPopulation: number; // Changed from string to number
  populationDensity: "abundant" | "common" | "moderate" | "limited" | "rare";
  seasonInfo?: string;
}

export interface Property {
  // Basic fields
  id: number;
  provider_id: number;
  property_name: string;
  description: string;
  
  // Location
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number;
  longitude: number;
  
  // Property details
  total_acres: number;
  primary_terrain?: string;
  
  // Complex fields (JSONB in database)
  acreage_breakdown?: AcreageBreakdown[];
  wildlife_info?: WildlifeInfo[];
  hunting_packages: HuntingPackage[];
  accommodations: AccommodationOption[];
  facilities?: string[];
  
  // Additional info
  rules?: string;
  safety_info?: string;
  license_requirements?: string;
  season_info?: string;
  
  // Media
  property_images: PropertyImage[] | string[];
  profile_image_index?: number;
  
  // Status
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  admin_feedback?: string;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  
  is_listed?: boolean;
  draft_completed_phase?: number; // Added this field for phased form support
  

  // Relations
  provider?: any;
  reviews?: any[];
  avg_rating?: number;
}