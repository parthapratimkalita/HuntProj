// property-form-schema.ts - Complete updated schema with enhanced validation and helper functions
import { z } from "zod";

// Define accommodation status enum with clearer values
export const accommodationStatusEnum = z.enum(["included", "extra", "without"]);
export type AccommodationStatus = z.infer<typeof accommodationStatusEnum>;

// Schema for acreage breakdown
export const acreageBreakdownSchema = z.object({
  acres: z.coerce.number().min(1, "Acreage must be at least 1"),
  terrainType: z.string().min(1, "Terrain type is required"),
  //description: z.string().optional(),
});

// Schema for wildlife/game information - UPDATED with number for population
export const wildlifeInfoSchema = z.object({
  species: z.string().min(1, "Species is required"),
  //estimatedPopulation: z.coerce.number().min(0, "Population must be a positive number"),
  populationDensity: z.coerce.number().min(0).max(100, "Population density must be between 0 and 100"),
  //seasonInfo: z.string().optional(),
});

// Schema for accommodation options
export const accommodationSchema = z.object({
  type: z.string().min(1, "Accommodation type is required"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  bedrooms: z.coerce.number().min(0),
  bathrooms: z.coerce.number().min(0),
  capacity: z.coerce.number().min(1, "Must accommodate at least 1 guest"),
  pricePerNight: z.coerce.number().min(0), // 0 means included in package
  amenities: z.array(z.string()).optional().default([]),
});

// ENHANCED: Schema for hunting packages with better validation
export const huntingPackageSchema = z.object({
  name: z.string().min(3, "Package name must be at least 3 characters"),
  huntingType: z.string().min(1, "Hunting type is required"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day"),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  maxHunters: z.coerce.number().min(1, "Must allow at least 1 hunter"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  includedItems: z.array(z.string()).default([]), // Always default to empty array
  accommodationStatus: accommodationStatusEnum.default("without"),
  defaultAccommodation: z.string().optional().default(""),
}).superRefine((data, ctx) => {
  // Custom validation: if accommodation is included, defaultAccommodation should be set
  if (data.accommodationStatus === "included" && !data.defaultAccommodation) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Default accommodation must be selected when accommodation is included",
      path: ['defaultAccommodation']
    });
  }
  
  // Ensure includedItems is always an array
  if (!Array.isArray(data.includedItems)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Included items must be an array",
      path: ['includedItems']
    });
  }
  
  // Validate package name uniqueness (within context if available)
  if (data.name && data.name.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Package name cannot be empty",
      path: ['name']
    });
  }
});

// ENHANCED: Flexible image validation for different stages of the process
const propertyImagesSchema = z.union([
  // For frontend form validation (File objects during selection)
  z.any().refine(
    (files) => {
      if (!files) return false;
      if (Array.isArray(files) && files.length > 0) return true;
      if (files instanceof FileList && files.length > 0) return true;
      if (files instanceof File) return true;
      return false;
    },
    "Please upload at least one property image"
  ),
  // For backend validation (URL strings)
  z.array(z.string().url("Invalid image URL")).min(1, "At least one image URL is required"),
  // For uploaded URLs (array of objects with url property)
  z.array(z.object({
    url: z.string().url("Invalid image URL"),
    filename: z.string().optional(),
    uploaded_at: z.string().optional(),
    size: z.number().optional(),
  })).min(1, "At least one image is required")
]);

// Optional image schema for updates
const propertyImagesUpdateSchema = z.union([
  z.any().optional(),
  z.array(z.string().url("Invalid image URL")).optional(),
  z.array(z.object({
    url: z.string().url("Invalid image URL"),
    filename: z.string().optional(),
    uploaded_at: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  z.undefined()
]).optional();


// Add draft schema
export const propertyDraftSchema = z.object({
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  
  // Location
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  country: z.string().default("United States"),
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  
  // Basic details
  totalAcres: z.coerce.number().min(1, "Total acreage is required"),
  //terrain: z.string().optional(),
  acreageBreakdown: z.array(acreageBreakdownSchema).optional(),
  wildlifeInfo: z.array(wildlifeInfoSchema).optional(),
  
  // Only profile image required
  propertyImages: z.array(z.any()).min(1, "Profile image is required"),
});

export type PropertyDraftData = z.infer<typeof propertyDraftSchema>;

// ENHANCED: Main property schema with improved validation
export const propertyFormSchema = z.object({
  // Basic Information
  providerId: z.number().optional(),
  propertyName: z.string().min(3, "Property name must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  
  // Location
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  country: z.string().min(2, "Country is required").default("United States"),
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  
  // Property Details
  totalAcres: z.coerce.number().min(1, "Total acreage is required"),
  acreageBreakdown: z.array(acreageBreakdownSchema).optional(),
  //terrain: z.string().optional(), // Keep for backward compatibility
  
  // Wildlife Information
  wildlifeInfo: z.array(wildlifeInfoSchema).optional(),
  
  // ENHANCED: Hunting Packages with better validation
  huntingPackages: z.array(huntingPackageSchema)
    .min(1, "At least one hunting package is required")
    .refine((packages) => {
      // Ensure all packages have unique names
      const names = packages
        .map(p => p.name.toLowerCase().trim())
        .filter(n => n.length > 0);
      const uniqueNames = new Set(names);
      return names.length === uniqueNames.size;
    }, {
      message: "Each hunting package must have a unique name"
    }),
  
  // Accommodation Options
  accommodations: z.array(accommodationSchema).min(1, "Add at least one accommodation option"),
  
  // Facilities & Amenities
  facilities: z.array(z.string()).optional().default([]),
  
  // Rules & Safety
  rules: z.string().optional(),
  safety: z.string().optional(),
  licenses: z.string().optional(),
  seasonInfo: z.string().optional(),
  
  // Media - flexible validation for different stages
  propertyImages: propertyImagesSchema,
  
  // Status
  status: z.string().optional(),
  adminFeedback: z.string().optional()
});

// Update schema with optional images for property edits
export const propertyUpdateFormSchema = propertyFormSchema.extend({
  propertyImages: propertyImagesUpdateSchema
});

// Type definitions
export type PropertyFormData = z.infer<typeof propertyFormSchema>;
export type HuntingPackage = z.infer<typeof huntingPackageSchema>;
export type AccommodationOption = z.infer<typeof accommodationSchema>;
export type AcreageBreakdown = z.infer<typeof acreageBreakdownSchema>;
export type WildlifeInfo = z.infer<typeof wildlifeInfoSchema>;

// Image data type definitions
export interface PropertyImageData {
  url: string;
  filename?: string;
  uploaded_at?: string;
  size?: number;
}

export interface ImageUploadProgress {
  total: number;
  uploaded: number;
  uploading: number;
  failed: number;
}

// ===============================
// HELPER FUNCTIONS - NEW/ENHANCED
// ===============================

// Helper function to create a new hunting package with proper defaults
export const createNewHuntingPackage = (): HuntingPackage => ({
  name: "",
  huntingType: "",
  duration: 3,
  price: 100,
  maxHunters: 4,
  description: "",
  includedItems: [], // Always start with empty array
  accommodationStatus: "without",
  defaultAccommodation: "",
});

// UPDATED: Helper function to sanitize hunting package data - handles both camelCase and snake_case
export const sanitizeHuntingPackage = (pkg: any): HuntingPackage => {
  const sanitized: HuntingPackage = {
    name: String(pkg.name || ""),
    huntingType: String(pkg.huntingType || pkg.hunting_type || ""), // Handle both formats
    duration: Number(pkg.duration) || 3,
    price: Number(pkg.price) || 100,
    maxHunters: Number(pkg.maxHunters || pkg.max_hunters) || 4, // Handle both formats
    description: String(pkg.description || ""),
    includedItems: Array.isArray(pkg.includedItems) 
      ? pkg.includedItems 
      : (Array.isArray(pkg.included_items) ? pkg.included_items : []), // Handle both formats
    accommodationStatus: (['included', 'extra', 'without'].includes(pkg.accommodationStatus || pkg.accommodation_status)) 
      ? (pkg.accommodationStatus || pkg.accommodation_status)
      : "without", // Handle both formats
    defaultAccommodation: String(pkg.defaultAccommodation || pkg.default_accommodation || ""), // Handle both formats
  };
  
  // Clear defaultAccommodation if accommodation is not included
  if (sanitized.accommodationStatus === 'without') {
    sanitized.defaultAccommodation = '';
  }
  
  return sanitized;
};

// NEW: Helper function to sanitize accommodation data - handles both camelCase and snake_case
export const sanitizeAccommodation = (acc: any): AccommodationOption => {
  return {
    type: String(acc.type || ""),
    name: String(acc.name || ""),
    description: String(acc.description || ""),
    bedrooms: Number(acc.bedrooms) || 0,
    bathrooms: Number(acc.bathrooms) || 0,
    capacity: Number(acc.capacity) || 1,
    pricePerNight: Number(acc.pricePerNight || acc.price_per_night) || 0, // Handle both formats
    amenities: Array.isArray(acc.amenities) ? acc.amenities : [],
  };
};

// NEW: Helper function to sanitize acreage breakdown data - handles both camelCase and snake_case
export const sanitizeAcreageBreakdown = (item: any): AcreageBreakdown => {
  return {
    acres: Number(item.acres) || 0,
    terrainType: String(item.terrainType || item.terrain_type || ""), // Handle both formats
    //description: String(item.description || ""),
  };
};

// NEW: Helper function to sanitize wildlife info data - handles both camelCase and snake_case
export const sanitizeWildlifeInfo = (item: any): WildlifeInfo => {
  return {
    species: String(item.species || ""),
    //estimatedPopulation: Number(item.estimatedPopulation || item.estimated_population) || 0, // Handle both formats
    populationDensity: Number(item.populationDensity || item.population_density) || 50, // Default to 50%
    //seasonInfo: String(item.seasonInfo || item.season_info || ""), // Handle both formats
  };
};

// Helper function to validate a single hunting package
export const validateSingleHuntingPackage = (pkg: HuntingPackage): string[] => {
  const errors: string[] = [];
  
  if (!pkg.name || pkg.name.trim().length < 3) {
    errors.push("Package name must be at least 3 characters");
  }
  
  if (!pkg.huntingType) {
    errors.push("Hunting type is required");
  }
  
  if (!pkg.description || pkg.description.trim().length < 10) {
    errors.push("Description must be at least 10 characters");
  }
  
  if (typeof pkg.duration !== 'number' || pkg.duration < 1) {
    errors.push("Duration must be at least 1 day");
  }
  
  if (typeof pkg.price !== 'number' || pkg.price < 1) {
    errors.push("Price must be greater than $0");
  }
  
  if (typeof pkg.maxHunters !== 'number' || pkg.maxHunters < 1) {
    errors.push("Must allow at least 1 hunter");
  }
  
  if (!pkg.accommodationStatus || !['included', 'extra', 'without'].includes(pkg.accommodationStatus)) {
    errors.push("Valid accommodation status is required");
  }
  
  if (pkg.accommodationStatus === 'included' && !pkg.defaultAccommodation) {
    errors.push("Default accommodation must be selected when accommodation is included");
  }
  
  if (!Array.isArray(pkg.includedItems)) {
    errors.push("Included items must be an array");
  }
  
  return errors;
};

// Helper function to validate all hunting packages
export const validateHuntingPackages = (packages: HuntingPackage[]): string[] => {
  const errors: string[] = [];
  
  if (!packages || packages.length === 0) {
    errors.push("At least one hunting package is required");
    return errors;
  }
  
  // Validate each package
  packages.forEach((pkg, index) => {
    const packageErrors = validateSingleHuntingPackage(pkg);
    packageErrors.forEach(error => {
      errors.push(`Package ${index + 1}: ${error}`);
    });
  });
  
  // Check for duplicate names
  const packageNames = packages
    .map(p => p.name.toLowerCase().trim())
    .filter(n => n.length > 0);
  const uniqueNames = new Set(packageNames);
  if (packageNames.length !== uniqueNames.size) {
    errors.push("Each hunting package must have a unique name");
  }
  
  return errors;
};

// Helper function to create a new accommodation
export const createNewAccommodation = (): AccommodationOption => ({
  type: "",
  name: "",
  description: "",
  bedrooms: 2,
  bathrooms: 1,
  capacity: 4,
  pricePerNight: 0,
  amenities: [],
});

// Helper function to create a new acreage breakdown
export const createNewAcreageBreakdown = (): AcreageBreakdown => ({
  acres: 0,
  terrainType: "",
  //description: "",
});

// Helper function to create new wildlife info
export const createNewWildlifeInfo = (): WildlifeInfo => ({
  species: "",
  populationDensity: 50,
  //estimatedPopulation: 0,
  //seasonInfo: "",
});

// Constants - Hunting Types
export const huntingTypes = [
  { id: "stand_hunt", name: "Stand Hunt" },
  { id: "stalk_hunt", name: "Stalk hunt" },
  { id: "driven_hunt", name: "Driven Hunt (Drückjagd)" },
  { id: "battue", name: "Battue (Treibjagd)" },
];

// Terrain types for better selection
export const terrainTypes = [
  { id: "forest", name: "Forest/Woodland" },
  { id: "field", name: "Field/Open country" },
  { id: "mountain", name: "Mountain/Hilly" },
  { id: "water", name: "Bodies of water" },
];

// Species options for dropdown - sorted alphabetically
export const wildlifeSpeciesList = [
  { id: "red_deer", name: "Red Deer" },
  { id: "fallow_deer", name: "Fallow Deer" },
  { id: "sika_deer", name: "Sika Deer" },
  { id: "roe_deer", name: "Roe Deer" },
  { id: "ibex", name: "Ibex" },
  { id: "chamois", name: "Chamois" },
  { id: "wild_boar", name: "Wild Boar" },
  { id: "mouflon", name: "Mouflon" },
  { id: "other", name: "Other" },
];

// Population density options
//export const populationDensityOptions = [
//  { id: "abundant", name: "Abundant", description: "Very high numbers, excellent hunting" },
//  { id: "common", name: "Common", description: "Good numbers, consistent hunting" },
//  { id: "moderate", name: "Moderate", description: "Average numbers, fair hunting" },
//  { id: "limited", name: "Limited", description: "Lower numbers, challenging hunting" },
//  { id: "rare", name: "Rare", description: "Minimal numbers, difficult hunting" },
//];

// Package inclusions with better organization
export const packageInclusions = [
  { id: "guide", label: "Professional Guide" },
  { id: "meals", label: "All Meals" },
  { id: "transportation", label: "Field Transportation" },
  { id: "game_processing", label: "Game Processing" },
  { id: "trophy_prep", label: "Trophy Preparation" },
  { id: "licenses", label: "Hunting License" },
  { id: "tags", label: "Tags/Permits" },
  { id: "equipment", label: "Basic Equipment" },
  { id: "insurance", label: "Hunt Insurance" },
  { id: "lodging", label: "Lodging Included" },
  { id: "accommodation", label: "Accommodation" },
];

export const accommodationTypes = [
  "Main Lodge", "Guest Cabin", "Bunkhouse", "RV Hookup", "Tent Site", "Ranch House"
];

export const accommodationAmenities = [
  { id: "wifi", label: "WiFi" },
  { id: "heating", label: "Heating" },
  { id: "air_conditioning", label: "Air Conditioning" },
  { id: "kitchen", label: "Kitchen" },
  { id: "private_bathroom", label: "Private Bathroom" },
  { id: "hot_water", label: "Hot Water" },
  { id: "electricity", label: "Electricity" },
  { id: "linens", label: "Linens Provided" },
  { id: "meals_area", label: "Dining Area" },
];

export const propertyFacilities = [
  { id: "shooting_range", label: "Shooting Range" },
  { id: "game_cleaning", label: "Game Cleaning Station" },
  { id: "walk_in_cooler", label: "Walk-in Cooler" },
  { id: "freezer", label: "Freezer Storage" },
  { id: "skinning_shed", label: "Skinning Shed" },
  { id: "equipment_rental", label: "Equipment Rental" },
  { id: "atv_available", label: "ATV Available" },
  { id: "boat_access", label: "Boat Access" },
  { id: "check_in_office", label: "Check-in Office" },
];

// ===============================
// IMAGE VALIDATION HELPERS
// ===============================

export const validateImageFile = (file: File): string | null => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: JPG, PNG, WebP`;
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 5MB`;
  }
  
  return null; // No errors
};

export const validateImageUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

export const validateImageUrls = (urls: string[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!urls || urls.length === 0) {
    errors.push("At least one image URL is required");
    return { valid: false, errors };
  }
  
  urls.forEach((url, index) => {
    if (!validateImageUrl(url)) {
      errors.push(`Invalid URL at index ${index}: ${url}`);
    }
  });
  
  return { valid: errors.length === 0, errors };
};

// ===============================
// FORM DATA TRANSFORMATION
// ===============================

export const transformFormDataForSubmission = (
  formData: PropertyFormData,
  uploadedImageUrls: string[],
  profileImageIndex: number
): any => {
  // Prepare image data with metadata
  const propertyImages = uploadedImageUrls.map((url, index) => ({
    url: url,
    filename: `property_image_${index + 1}`,
    uploaded_at: new Date().toISOString(),
    size: 0, // Size not available after upload, but can be tracked if needed
  }));

  return {
    // Basic Information
    property_name: formData.propertyName,
    description: formData.description,
    
    // Location
    address: formData.address,
    city: formData.city,
    state: formData.state,
    zip_code: formData.zipCode,
    country: formData.country,
    latitude: parseFloat(formData.latitude),
    longitude: parseFloat(formData.longitude),
    
    // Property Details
    total_acres: formData.totalAcres,
    //primary_terrain: formData.terrain || "",
    
    // Complex data structures - ensure proper structure
    acreage_breakdown: formData.acreageBreakdown || [],
    
    // FIXED: Remove the commented out fields from wildlife_info mapping
    wildlife_info: formData.wildlifeInfo?.map(info => ({
      species: info.species,
      population_density: info.populationDensity,
    })) || [],
    
    hunting_packages: formData.huntingPackages.map(pkg => sanitizeHuntingPackage(pkg)),
    accommodations: formData.accommodations,
    facilities: formData.facilities || [],
    
    // Additional Information
    rules: formData.rules || "",
    safety_info: formData.safety || "",
    license_requirements: formData.licenses || "",
    season_info: formData.seasonInfo || "",
    
    // Media
    property_images: propertyImages,
    profile_image_index: profileImageIndex,
  };
};

// ===============================
// ENHANCED FORM VALIDATION
// ===============================

export const validatePropertyForm = (
  formData: PropertyFormData,
  uploadedImageUrls: string[],
  isEditMode: boolean = false
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check if images are uploaded (required only for new properties)
  if (!isEditMode && uploadedImageUrls.length === 0) {
    errors.push("Please upload at least one property image");
  }
  
  // Validate hunting packages with detailed error messages
  const packageErrors = validateHuntingPackages(formData.huntingPackages);
  errors.push(...packageErrors);
  
  // Validate accommodations
  if (!formData.accommodations || formData.accommodations.length === 0) {
    errors.push("At least one accommodation option is required");
  }
  
  // Validate coordinates
  try {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      errors.push("Invalid latitude or longitude coordinates");
    }
  } catch {
    errors.push("Latitude and longitude must be valid numbers");
  }
  
  // Validate basic required fields
  if (!formData.propertyName || formData.propertyName.trim().length < 3) {
    errors.push("Property name must be at least 3 characters");
  }
  
  if (!formData.description || formData.description.trim().length < 20) {
    errors.push("Description must be at least 20 characters");
  }
  
  if (!formData.totalAcres || formData.totalAcres < 1) {
    errors.push("Total acreage must be at least 1");
  }
  
  return { valid: errors.length === 0, errors };
};