// utils/property-helpers.ts
import { Property } from "@/types/property";

/**
 * Get the display price for a property (lowest hunting package price)
 */
export const getPropertyPrice = (property: Property): number => {
  if (!property.hunting_packages || property.hunting_packages.length === 0) {
    return 0;
  }
  
  const prices = property.hunting_packages.map(pkg => pkg.price || 0);
  return Math.min(...prices);
};

/**
 * Get the property location string
 */
export const getPropertyLocation = (property: Property): string => {
  if (property.city && property.state) {
    return `${property.city}, ${property.state}`;
  }
  if (property.city) return property.city;
  if (property.state) return property.state;
  return 'Location not specified';
};

/**
 * Get property image URLs as string array
 */
export const getPropertyImageUrls = (property: Property): string[] => {
  if (!property.property_images || property.property_images.length === 0) {
    return [];
  }
  
  return property.property_images.map((img: any) => {
    if (typeof img === 'string') return img;
    if (img && typeof img === 'object' && img.url) return img.url;
    return '';
  }).filter(url => url !== '');
};

/**
 * Get the main property image URL
 */
export const getPropertyMainImage = (property: Property): string => {
  const imageUrls = getPropertyImageUrls(property);
  const profileIndex = property.profile_image_index || 0;
  
  if (imageUrls.length > 0 && profileIndex < imageUrls.length) {
    return imageUrls[profileIndex];
  }
  
  return imageUrls[0] || '/placeholder-property.jpg';
};

/**
 * Get property status color classes
 */
export const getPropertyStatusClasses = (status: string): string => {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "bg-green-100 text-green-800 border border-green-200";
    case "PENDING":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};